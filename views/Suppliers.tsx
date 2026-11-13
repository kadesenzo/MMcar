import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Search, Phone, MessageCircle, Mail, MapPin, 
  Trash2, Edit3, DollarSign, Package, Star, Clock, ExternalLink, X
} from 'lucide-react';
import { Supplier, UserSession } from '../types';

interface SuppliersProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Distribuidora Nakata & Freios Brasil',
    contactName: 'Carlos Eduardo',
    phone: '11987654321',
    email: 'comercial@nakatafreios.com.br',
    cnpj: '12.345.678/0001-90',
    category: 'Freios e Suspensão',
    products: 'Discos, Pastilhas, Amortecedores, Pivôs',
    paymentTerms: '28 dias / Boleto e PIX',
    rating: 5,
    notes: 'Entrega rápida no mesmo dia em Registro/SP.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sup-2',
    name: 'Auto Peças Vale do Ribeira',
    contactName: 'Renato Silva',
    phone: '13998765432',
    email: 'vendas@valeribeirapecas.com.br',
    cnpj: '98.765.432/0001-11',
    category: 'Motor e Filtros',
    products: 'Correias, Filtros Mann, Velas NGK, Óleo Motul',
    paymentTerms: 'À vista com 5% de desconto ou 30 dias',
    rating: 4,
    notes: 'Bom estoque local para emergências na bancada.',
    createdAt: new Date().toISOString()
  }
];

export const Suppliers: React.FC<SuppliersProps> = ({ session, syncData }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [category, setCategory] = useState('Freios e Suspensão');
  const [products, setProducts] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');

  const tenant = session?.username || 'rafael';

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem(`kaenpro_${tenant}_suppliers`) || localStorage.getItem('kaenpro_rafael_suppliers');
      if (saved) {
        try {
          setSuppliers(JSON.parse(saved));
        } catch (e) {
          setSuppliers(INITIAL_SUPPLIERS);
        }
      } else {
        setSuppliers(INITIAL_SUPPLIERS);
        localStorage.setItem(`kaenpro_${tenant}_suppliers`, JSON.stringify(INITIAL_SUPPLIERS));
      }
    };

    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [tenant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let updated: Supplier[];
    if (editingSupplier) {
      updated = suppliers.map(s => s.id === editingSupplier.id ? {
        ...s,
        name,
        contactName,
        phone,
        email,
        cnpj,
        category,
        products,
        paymentTerms,
        notes
      } : s);
    } else {
      const newSup: Supplier = {
        id: `sup-${Date.now()}`,
        name,
        contactName,
        phone,
        email,
        cnpj,
        category,
        products,
        paymentTerms,
        rating: 5,
        notes,
        createdAt: new Date().toISOString()
      };
      updated = [newSup, ...suppliers];
    }

    setSuppliers(updated);
    localStorage.setItem(`kaenpro_${tenant}_suppliers`, JSON.stringify(updated));
    localStorage.setItem(`kaenpro_rafael_suppliers`, JSON.stringify(updated));
    if (syncData) {
      await syncData('suppliers', updated);
    }
    window.dispatchEvent(new CustomEvent('kaen_storage_updated'));
    setShowModal(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este fornecedor da base da oficina?')) return;
    const updated = suppliers.filter(s => s.id !== id);
    setSuppliers(updated);
    localStorage.setItem(`kaenpro_${tenant}_suppliers`, JSON.stringify(updated));
    localStorage.setItem(`kaenpro_rafael_suppliers`, JSON.stringify(updated));
    if (syncData) {
      await syncData('suppliers', updated);
    }
    window.dispatchEvent(new CustomEvent('kaen_storage_updated'));
  };

  const handleEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactName(s.contactName);
    setPhone(s.phone);
    setEmail(s.email || '');
    setCnpj(s.cnpj || '');
    setCategory(s.category);
    setProducts(s.products);
    setPaymentTerms(s.paymentTerms);
    setNotes(s.notes || '');
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setCnpj('');
    setCategory('Freios e Suspensão');
    setProducts('');
    setPaymentTerms('');
    setNotes('');
  };

  const openWhatsApp = (phoneNum: string, supplierName: string) => {
    const clean = phoneNum.replace(/\D/g, '');
    const text = `Olá, equipe da *${supplierName}*! Tudo bem? Aqui é da *Auto Mecânica KAEN*. Gostaria de cotar a disponibilidade e preço de algumas peças para nossa oficina.`;
    const url = clean.length >= 10 ? `https://wa.me/55${clean}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filtered = suppliers.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.products || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contactName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1200px] min-w-0 px-3 sm:px-6 space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 bg-zinc-950/80 border border-white/5 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest">
            <Truck size={16} />
            <span>Gestão de Suprimentos & Peças</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1 italic">
            Fornecedores de Peças & Materiais
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Mantenha contatos, prazos de entrega, condições de pagamento e cotações ágeis com fornecedores parceiros.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="w-full sm:w-auto px-5 py-3.5 bg-[#FF2D55] hover:bg-[#ff1744] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#FF2D55]/30 transition-all duration-200 active:scale-95 shrink-0"
        >
          <Plus size={16} />
          <span>Cadastrar Fornecedor</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar fornecedor por nome, produtos, categoria ou contato..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-white/5 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(s => (
          <div
            key={s.id}
            className="p-5 bg-zinc-950/70 border border-white/5 hover:border-white/10 rounded-3xl space-y-4 transition-all duration-300 relative group min-w-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md inline-block">
                  {s.category}
                </span>
                <h3 className="text-base font-black uppercase text-white tracking-tight mt-1 break-words">{s.name}</h3>
                <p className="text-xs text-zinc-400 truncate">Contato: <strong className="text-zinc-200">{s.contactName}</strong></p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleEdit(s)}
                  className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5"
                  title="Editar"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-white/5"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="p-3 bg-black/60 rounded-2xl space-y-1.5 text-xs text-zinc-400 break-words">
              <p><strong className="text-zinc-300">Produtos / Especialidades:</strong> {s.products || 'Não informado'}</p>
              <p><strong className="text-zinc-300">Prazos & Pagamento:</strong> {s.paymentTerms || 'Não informado'}</p>
              {s.notes && <p className="text-[11px] text-zinc-500 italic mt-1">{s.notes}</p>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
              <span className="text-xs font-mono text-zinc-400 truncate">{s.phone}</span>
              <button
                onClick={() => openWhatsApp(s.phone, s.name)}
                className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-200 active:scale-95 shrink-0"
              >
                <MessageCircle size={14} />
                <span>Pedir Cotação</span>
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full p-12 text-center bg-zinc-950/40 border border-dashed border-white/10 rounded-3xl">
            <Truck size={32} className="mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-bold text-zinc-400">Nenhum fornecedor encontrado</p>
          </div>
        )}
      </div>

      {/* Modal Cadastrar / Editar */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-lg p-5 sm:p-8 space-y-5 shadow-2xl relative my-auto max-h-[92dvh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white rounded-xl"
            >
              <X size={20} />
            </button>

            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400">Fornecedor Parceiro</span>
              <h2 className="text-xl font-black uppercase italic text-white mt-0.5">
                {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h2>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">
                  Nome da Empresa / Distribuidora
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Distribuidora Nakata & Freios Brasil"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">
                    Nome do Vendedor / Contato
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">
                    WhatsApp Comercial
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(13) 99689-2958"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">
                    Categoria Principal
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-bold"
                  >
                    <option value="Freios e Suspensão">Freios e Suspensão</option>
                    <option value="Motor e Filtros">Motor e Filtros</option>
                    <option value="Elétrica e Injeção">Elétrica e Injeção</option>
                    <option value="Óleos e Fluidos">Óleos e Fluidos</option>
                    <option value="Pneus e Rodas">Pneus e Rodas</option>
                    <option value="Funilaria e Acessórios">Funilaria e Acessórios</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">
                    Prazos e Pagamento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 28 dias / Boleto e PIX"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">
                  Produtos / Marcas Fornecidas
                </label>
                <input
                  type="text"
                  placeholder="Ex: Discos Nakata, Pastilhas Cobreq, Amortecedores Monroe"
                  value={products}
                  onChange={(e) => setProducts(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">
                  Observações Internas (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Entrega rápida pela manhã no pátio"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl font-black uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#FF2D55] hover:bg-[#ff1744] text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-[#FF2D55]/30"
                >
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
