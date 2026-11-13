import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, Clock, Wrench, Search, Plus, Trash2, User, X, Check, Edit3 } from 'lucide-react';
import { Employee, UserSession } from '../types';

interface EmployeesProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

const Employees: React.FC<EmployeesProps> = ({ session, syncData }) => {
  const [staff, setStaff] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newEmployee, setNewEmployee] = useState<{
    name: string;
    role: string;
    shift: string;
    status: 'Ativo' | 'Inativo';
  }>({
    name: '',
    role: 'Mecânico',
    shift: 'Diurno',
    status: 'Ativo',
  });

  const canManageTeam = !session || session.role === 'Dono';

  const loadData = () => {
    if (session) {
      try {
        const raw = localStorage.getItem(`kaenpro_${session.username}_employees`) || localStorage.getItem('kaenpro_rafael_employees') || '[]';
        const saved = JSON.parse(raw);
        setStaff(Array.isArray(saved) ? saved : []);
      } catch (e) {
        setStaff([]);
      }
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [session]);

  const resetForm = () => {
    setEditingEmployee(null);
    setNewEmployee({ name: '', role: 'Mecânico', shift: 'Diurno', status: 'Ativo' });
  };

  const handleOpenCreate = () => {
    if (!canManageTeam) {
      alert("ACESSO NEGADO: Apenas o Administrador (Dono) pode cadastrar colaboradores.");
      return;
    }
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (emp: Employee) => {
    if (!canManageTeam) {
      alert("ACESSO NEGADO: Apenas o Administrador (Dono) pode editar colaboradores.");
      return;
    }
    setEditingEmployee(emp);
    setNewEmployee({
      name: emp.name || '',
      role: emp.role || 'Mecânico',
      shift: emp.shift || 'Diurno',
      status: emp.status === 'Inativo' ? 'Inativo' : 'Ativo',
    });
    setShowModal(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canManageTeam) {
      alert("ACESSO NEGADO: Apenas o Administrador (Dono) pode alterar a equipe.");
      return;
    }
    if (!newEmployee.name.trim() || !session || !syncData) return;

    let updatedStaff: Employee[];
    if (editingEmployee) {
      updatedStaff = staff.map(emp => emp.id === editingEmployee.id ? {
        ...emp,
        name: newEmployee.name.trim(),
        role: newEmployee.role,
        shift: newEmployee.shift,
        status: newEmployee.status
      } : emp);
    } else {
      const employee: Employee = {
        id: Math.random().toString(36).substr(2, 9),
        name: newEmployee.name.trim(),
        role: newEmployee.role,
        shift: newEmployee.shift,
        services: 0,
        status: 'Ativo',
        createdAt: new Date().toISOString()
      };
      updatedStaff = [...staff, employee];
    }

    setStaff(updatedStaff);
    await syncData('employees', updatedStaff);
    setShowModal(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!canManageTeam) {
      alert("ACESSO NEGADO: Apenas o Administrador (Dono) pode remover colaboradores.");
      return;
    }
    if (!session || !syncData) return;
    if (confirm("Deseja remover este colaborador da equipe?")) {
      const updated = staff.filter(e => e.id !== id);
      setStaff(updated);
      await syncData('employees', updated);
    }
  };

  const filtered = staff.filter(e => 
    (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1200px] min-w-0 px-3 sm:px-6 space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Equipe Técnica</h1>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mt-1">Gestão de colaboradores ativos em <span className="text-white">{session?.username}</span></p>
        </div>
        {canManageTeam && (
          <button 
            onClick={handleOpenCreate}
            className="w-full sm:w-auto bg-[#FF2D55] px-6 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center space-x-2 hover:bg-[#D11D40] transition-all shadow-xl shadow-red-900/20 shrink-0"
          >
            <Plus size={18} />
            <span>Cadastrar Colaborador</span>
          </button>
        )}
      </div>

      {!canManageTeam && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-amber-400 text-xs font-bold">
          <Shield size={18} className="shrink-0" />
          <span>Modo somente leitura: apenas o perfil Administrador (Dono) pode cadastrar, editar ou excluir integrantes da equipe.</span>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-2xl flex items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-3.5 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar funcionário..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none py-3 pl-12 pr-4 focus:ring-0 text-white font-bold placeholder-zinc-700 outline-none" 
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-[2rem] sm:rounded-[2.5rem] p-12 sm:p-16 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-600">
            <UserCheck size={32} />
          </div>
          <p className="text-zinc-500 font-black uppercase tracking-widest">Base de equipe vazia.</p>
          <p className="text-zinc-600 text-xs mt-1 uppercase">Nenhum funcionário cadastrado no servidor.</p>
        </div>
      ) : (
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-xl">
          {/* Mobile Cards View */}
          <div className="md:hidden divide-y divide-zinc-800">
            {filtered.map((e) => (
              <div key={e.id} className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-500 border border-zinc-800 shrink-0">
                      <User size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-white uppercase tracking-tight break-words">{e.name}</p>
                      <span className="inline-block mt-1 bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase text-zinc-400">
                        {e.role}
                      </span>
                    </div>
                  </div>
                  {canManageTeam && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(e)}
                        className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        title="Editar colaborador"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(e.id)}
                        className="p-2.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Remover colaborador"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3 text-center">
                  <div>
                    <span className="text-[8px] font-black text-zinc-500 uppercase block">Turno</span>
                    <span className="text-[10px] font-black uppercase text-zinc-300 mt-0.5 block">{e.shift || 'Diurno'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-zinc-500 uppercase block">Status</span>
                    <span className={`text-[10px] font-black uppercase mt-0.5 inline-flex items-center gap-1 ${e.status === 'Inativo' ? 'text-zinc-500' : 'text-emerald-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${e.status === 'Inativo' ? 'bg-zinc-500' : 'bg-emerald-500'}`}></span>
                      {e.status || 'Ativo'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-zinc-500 uppercase block">Início</span>
                    <span className="text-[10px] font-bold text-zinc-400 mt-0.5 block">
                      {e.createdAt ? new Date(e.createdAt).toLocaleDateString('pt-BR') : '---'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-950/80 text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-black">
                  <th className="px-8 py-5">Colaborador</th>
                  <th className="px-8 py-5">Cargo / Acesso</th>
                  <th className="px-8 py-5">Turno</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Data Início</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-11 h-11 bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-500 border border-zinc-800 group-hover:border-[#FF2D55]/50 transition-all">
                          <User size={22} />
                        </div>
                        <p className="text-sm font-black text-white uppercase tracking-tight">{e.name}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-zinc-400">
                        {e.role}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Clock size={14} />
                        <span className="text-[10px] font-black uppercase">{e.shift}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`flex items-center gap-2 ${e.status === 'Inativo' ? 'text-zinc-500' : 'text-emerald-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${e.status === 'Inativo' ? 'bg-zinc-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{e.status || 'Ativo'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs text-zinc-500 font-bold uppercase tracking-widest">
                      {e.createdAt ? new Date(e.createdAt).toLocaleDateString('pt-BR') : '---'}
                    </td>
                    <td className="px-8 py-6 text-right">
                      {canManageTeam && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(e)}
                            className="p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            title="Editar colaborador"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(e.id)}
                            className="p-3 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Remover colaborador"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cadastro / Edição */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-2xl relative animate-in zoom-in my-auto max-h-[92dvh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 sm:top-8 sm:right-8 text-zinc-500 hover:text-white p-2"><X size={24} /></button>
            
            <div className="flex items-center gap-4 mb-6 sm:mb-10 pr-8">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#FF2D55] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-900/20 shrink-0">
                <UserCheck size={26} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tighter">
                  {editingEmployee ? 'Editar Integrante' : 'Novo Integrante'}
                </h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Equipe de {session?.username}</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5 sm:space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome do Colaborador *</label>
                <input 
                  type="text" 
                  required
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 sm:px-6 py-4 text-white focus:border-[#FF2D55] outline-none font-bold placeholder-zinc-800"
                  placeholder="DIGITE O NOME COMPLETO"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Função</label>
                  <select 
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 sm:px-6 py-4 text-white focus:border-[#FF2D55] outline-none font-bold"
                  >
                    <option value="Mecânico">Mecânico</option>
                    <option value="Recepção">Recepção</option>
                    <option value="Auxiliar">Auxiliar</option>
                    <option value="Estoque">Estoque</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Dono">Dono</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Turno</label>
                  <select 
                    value={newEmployee.shift}
                    onChange={(e) => setNewEmployee({...newEmployee, shift: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 sm:px-6 py-4 text-white focus:border-[#FF2D55] outline-none font-bold"
                  >
                    <option value="Diurno">Diurno</option>
                    <option value="Noturno">Noturno</option>
                    <option value="Flexível">Flexível</option>
                  </select>
                </div>
              </div>

              {editingEmployee && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Status</label>
                  <select 
                    value={newEmployee.status}
                    onChange={(e) => setNewEmployee({...newEmployee, status: e.target.value as 'Ativo' | 'Inativo'})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 sm:px-6 py-4 text-white focus:border-[#FF2D55] outline-none font-bold"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-[#FF2D55] py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-red-900/30 mt-4 active:scale-95 transition-transform"
              >
                {editingEmployee ? 'Salvar Alterações' : 'Efetivar Contratação'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
