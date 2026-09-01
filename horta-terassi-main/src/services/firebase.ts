import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch,
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  User
} from 'firebase/auth';
import { Cliente, Funcionario, Pedido, PrecosOverrides, Produto, Promocao, TransporteConfig } from '../types';
import { DEFAULT_CLIENTES, DEFAULT_FUNCIONARIOS, DEFAULT_PRODUTOS, DEFAULT_TRANSPORTE } from '../constants/initialData';

// Configuração oficial do projeto Firebase da Horta Terassi
export const firebaseConfig = {
  apiKey: "AIzaSyCyZY92V3lUvChh2Fk_hhYiTFyLpdqiTys",
  authDomain: "horta-f30f3.firebaseapp.com",
  projectId: "horta-f30f3",
  storageBucket: "horta-f30f3.firebasestorage.app",
  messagingSenderId: "255881012749",
  appId: "1:255881012749:web:2123e61b14099222329744"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Lista estrita de e-mails autorizados a acessar o sistema
export const ALLOWED_EMAILS = [
  'tanathus@horta.com',
  'tanathus@horta',
  'fabricio@horta.com',
  'fabricio@horta',
  'arthurfepires@gmail.com' // E-mail da conta do desenvolvedor para suporte
];

// E-mail exclusivo com permissão de Administrador
export const ADMIN_EMAILS = [
  'tanathus@horta.com',
  'tanathus@horta',
  'arthurfepires@gmail.com'
];

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ALLOWED_EMAILS.some(allowed => clean === allowed.toLowerCase() || clean.startsWith(allowed.toLowerCase()));
}

export function isEmailAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.some(admin => clean === admin.toLowerCase() || clean.startsWith(admin.toLowerCase()));
}

// Helpers para Firestore
export async function getOrInitDoc<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const docRef = doc(db, 'horta_data', key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && 'value' in data) {
        return data.value as T;
      }
      return data as T;
    }
    return defaultValue;
  } catch (error) {
    console.error(`Erro ao carregar doc ${key} do Firebase:`, error);
    return defaultValue;
  }
}

export async function saveDocData<T>(key: string, data: T): Promise<void> {
  try {
    const docRef = doc(db, 'horta_data', key);
    await setDoc(docRef, { value: data });
  } catch (error) {
    console.error(`Erro ao salvar doc ${key} no Firebase:`, error);
    throw error;
  }
}

// Carregamento de pedidos da subcoleção horta_data/pedidos/items
export async function loadFirebasePedidos(): Promise<Pedido[]> {
  try {
    // 1. Verificar se há dados no formato legado (array em horta_data/pedidos)
    const legacyRef = doc(db, 'horta_data', 'pedidos');
    const legacySnap = await getDoc(legacyRef);
    if (legacySnap.exists() && legacySnap.data() && Array.isArray(legacySnap.data()?.value) && legacySnap.data()?.value.length) {
      const antigos: Pedido[] = legacySnap.data()?.value;
      const batchSize = 400;
      for (let i = 0; i < antigos.length; i += batchSize) {
        const lote = antigos.slice(i, i + batchSize);
        const batch = writeBatch(db);
        lote.forEach(p => {
          const id = p.id || `ped_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          batch.set(doc(db, 'horta_data', 'pedidos', 'items', id), { ...p, id });
        });
        await batch.commit();
      }
      await setDoc(legacyRef, { value: [], migrado: true });
    }

    // 2. Carregar todos os documentos da subcoleção
    const itemsCol = collection(db, 'horta_data', 'pedidos', 'items');
    const snapshot = await getDocs(itemsCol);
    return snapshot.docs.map(d => ({ ...(d.data() as Pedido), id: d.id }));
  } catch (error) {
    console.error('Erro ao carregar pedidos do Firebase:', error);
    return [];
  }
}

export async function saveFirebasePedido(pedido: Pedido): Promise<void> {
  try {
    const docRef = doc(db, 'horta_data', 'pedidos', 'items', pedido.id);
    await setDoc(docRef, pedido);
  } catch (error) {
    console.error('Erro ao salvar pedido no Firebase:', error);
    throw error;
  }
}

export async function deleteFirebasePedido(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'horta_data', 'pedidos', 'items', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Erro ao excluir pedido no Firebase:', error);
    throw error;
  }
}

export async function importarPedidosBatch(novosPedidos: Pedido[]): Promise<void> {
  const batchSize = 400;
  for (let i = 0; i < novosPedidos.length; i += batchSize) {
    const lote = novosPedidos.slice(i, i + batchSize);
    const batch = writeBatch(db);
    lote.forEach(p => {
      const id = p.id || `ped_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      batch.set(doc(db, 'horta_data', 'pedidos', 'items', id), { ...p, id });
    });
    await batch.commit();
  }
}

// ===== Promoções (lançadas pelo bot de WhatsApp) =====

// Ouve em tempo real as promoções ativas (ativa == true), filtrando também
// as que já venceram (mesma lógica usada pelo bot). Retorna a função de
// unsubscribe, pra ser chamada no cleanup do useEffect.
export function subscribePromocoesAtivas(callback: (promocoes: Promocao[]) => void): () => void {
  const q = query(collection(db, 'promocoes'), where('ativa', '==', true));
  return onSnapshot(
    q,
    snapshot => {
      const agora = Date.now();
      const ativas = snapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as Omit<Promocao, 'id'>) }))
        .filter(p => {
          const validadeMs = (p.validade as any)?.toMillis?.() ?? 0;
          return validadeMs >= agora;
        });
      callback(ativas);
    },
    error => {
      console.error('Erro ao ouvir promoções ativas:', error);
      callback([]);
    }
  );
}

// ===== Registro de Acesso / Auditoria =====

export interface LogAcesso {
  id?: string;
  email: string;
  apelido: string;
  tipo: 'login' | 'criacao' | 'edicao' | 'exclusao';
  entidade?: 'pedido' | 'cliente' | 'produto' | 'funcionario';
  entidadeId?: string;
  descricao?: string;
  dadosAntes?: string; // snapshot em JSON do item no momento da exclusão, para permitir recuperação
  recuperado?: boolean; // marca se este log de exclusão já foi revertido
  timestamp?: any;
}

export async function registrarLog(log: Omit<LogAcesso, 'id' | 'timestamp'>): Promise<void> {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(doc(db, 'logs_acesso', id), {
      ...log,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // Falha ao registrar log não deve travar a ação do usuário
    console.error('Erro ao registrar log de acesso:', error);
  }
}

export async function loadLogsPorData(dataISO: string): Promise<LogAcesso[]> {
  try {
    const inicio = new Date(`${dataISO}T00:00:00`);
    const fim = new Date(`${dataISO}T23:59:59.999`);
    const logsCol = collection(db, 'logs_acesso');
    const q = query(
      logsCol,
      where('timestamp', '>=', inicio),
      where('timestamp', '<=', fim),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as LogAcesso) }));
  } catch (error) {
    console.error('Erro ao carregar logs de acesso:', error);
    return [];
  }
}

// Marca um log de exclusão como já recuperado (evita recuperar o mesmo item duas vezes)
export async function marcarLogComoRecuperado(logId: string): Promise<void> {
  try {
    await setDoc(doc(db, 'logs_acesso', logId), { recuperado: true }, { merge: true });
  } catch (error) {
    console.error('Erro ao marcar log como recuperado:', error);
  }
}

// Restaura um pedido excluído a partir do snapshot salvo no log
export async function restaurarPedido(pedido: Pedido): Promise<void> {
  await saveFirebasePedido(pedido);
}

// Restaura um cliente, produto ou funcionário excluído a partir do snapshot salvo no log,
// devolvendo-o para a lista correspondente no Firestore (horta_data/{chave})
export async function restaurarItemEmLista<T extends { id?: string; codigo?: string }>(
  chave: 'clientes' | 'produtos' | 'funcionarios',
  itemRestaurado: T
): Promise<void> {
  const listaAtual = await getOrInitDoc<T[]>(chave, []);
  const jaExiste = listaAtual.some(item =>
    (itemRestaurado.id && item.id === itemRestaurado.id) ||
    (itemRestaurado.codigo && item.codigo === itemRestaurado.codigo)
  );
  if (jaExiste) return;
  await saveDocData(chave, [...listaAtual, itemRestaurado]);
}
