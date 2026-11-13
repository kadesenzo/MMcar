import React, { useEffect, useState } from 'react';
import { ServiceOrder, PaymentStatus, FiscalConfig } from '../types';
import { MMCarLogo } from './MMCarLogo';
import { loadMMCarFiscalConfig } from '../src/utils/workshopHelpers';

interface InvoiceProps {
  os: ServiceOrder;
  tenant?: string;
}

const Invoice: React.FC<InvoiceProps> = ({ os, tenant = 'rafael' }) => {
  const [fiscal, setFiscal] = useState<FiscalConfig>(() => loadMMCarFiscalConfig(tenant));

  useEffect(() => {
    const refresh = () => setFiscal(loadMMCarFiscalConfig(tenant));
    refresh();
    window.addEventListener('kaen_storage_updated', refresh);
    return () => window.removeEventListener('kaen_storage_updated', refresh);
  }, [tenant]);

  const totalItems = os.items.length + (os.laborValue > 0 ? 1 : 0);

  let densityClass = '';
  if (totalItems > 18) densityClass = 'micro-mode';
  else if (totalItems > 10) densityClass = 'compact-mode';

  const warrantyDays = os.warrantyDays || 90;
  const tradeUpper = (fiscal.tradeName || 'MM CAR AUTO CENTER').toUpperCase();

  return (
    <div className={`kaen-invoice-render ${densityClass}`}>
      <div className="inv-watermark">{tradeUpper}</div>

      {/* Header */}
      <div className="inv-header">
        <div className="inv-logo-area">
          <div className="inv-logo-box">
            <MMCarLogo variant="icon" className="w-full h-full" theme="dark" />
          </div>
          <div className="inv-company-info">
            <h1>{fiscal.tradeName}</h1>
            <p>
              {fiscal.companyName} • CNPJ: {fiscal.cnpj}
              {fiscal.ie ? ` • IE: ${fiscal.ie}` : ''}
            </p>
            <p>{fiscal.address || 'Rua Joaquim Marques Alves, 765 - Registro/SP'}</p>
            <p>
              WhatsApp / Tel: {fiscal.phone || '(13) 99689-2958'}
              {fiscal.email ? ` • ${fiscal.email}` : ''}
            </p>
          </div>
        </div>
        <div className="inv-os-info">
          <h2>Ordem de Serviço</h2>
          <p className="os-number">{os.osNumber}</p>
          <p className="os-date">{new Date(os.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Client & Vehicle Info */}
      <div className="inv-client-card">
        <div className="inv-info-group">
          <label>Cliente</label>
          <span>{os.clientName}</span>
        </div>
        <div className="inv-info-group">
          <label>Telefone</label>
          <span>{os.clientPhone || 'Não informado'}</span>
        </div>
        <div className="inv-info-group">
          <label>Veículo</label>
          <span>{os.vehicleModel}</span>
        </div>
        <div className="inv-info-group">
          <label>Placa</label>
          <span>{os.vehiclePlate}</span>
        </div>
        <div className="inv-info-group">
          <label>Kilometragem</label>
          <span>{os.vehicleKm || '0'} KM</span>
        </div>
        <div className="inv-info-group">
          <label>Garantia</label>
          <span>{warrantyDays} Dias (Peças e Mão de Obra)</span>
        </div>
        {os.mechanicResponsible && (
          <div className="inv-info-group">
            <label>Responsável Técnico</label>
            <span>{os.mechanicResponsible}</span>
          </div>
        )}
        {os.boxNumber && (
          <div className="inv-info-group">
            <label>Box / Elevador</label>
            <span>{os.boxNumber}</span>
          </div>
        )}
        {os.problem && (
          <div className="inv-info-group" style={{ gridColumn: os.mechanicResponsible || os.boxNumber ? 'span 1' : 'span 3' }}>
            <label>Diagnóstico / Solicitação</label>
            <span style={{ fontSize: '12px' }}>{os.problem}</span>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="inv-table-container">
        <table className="invoice-table">
          <thead>
            <tr>
              <th className="col-desc">Descrição Técnica do Serviço / Peça</th>
              <th className="col-qtd">Qtd</th>
              <th className="col-unit">Unitário</th>
              <th className="col-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {os.items.map((item, idx) => (
              <tr key={idx}>
                <td className="col-desc">{item.description}</td>
                <td className="col-qtd">{item.quantity}</td>
                <td className="col-unit">R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="col-total">R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {os.laborValue > 0 && (
              <tr>
                <td className="col-desc">Mão de Obra Técnica Especializada — {fiscal.tradeName}</td>
                <td className="col-qtd">1</td>
                <td className="col-unit">R$ {os.laborValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="col-total">R$ {os.laborValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
            {os.discount > 0 && (
              <tr>
                <td className="col-desc" style={{ color: '#059669' }}>Desconto Comercial Aplicado</td>
                <td className="col-qtd">1</td>
                <td className="col-unit" style={{ color: '#059669' }}>- R$ {os.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="col-total" style={{ color: '#059669' }}>- R$ {os.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Vistoria Fotográfica: Fotos Antes & Depois anexadas à Nota */}
      {os.proofPhotos && os.proofPhotos.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-zinc-200 bg-zinc-50/70">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
              Vistoria Técnica & Registros Fotográficos (Entrada / Conclusão)
            </span>
            <span className="text-[8px] font-bold text-zinc-500 uppercase">
              {os.proofPhotos.length} Fotos Anexadas
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {os.proofPhotos.slice(0, 4).map((photo, i) => (
              <div key={photo.id || i} className="border border-zinc-300 rounded-lg overflow-hidden bg-white">
                <img src={photo.url} alt={photo.label} className="w-full h-16 object-cover" referrerPolicy="no-referrer" />
                <div className="p-1 bg-zinc-100 text-center">
                  <span className={`text-[7px] font-black uppercase px-1 py-0.2 rounded inline-block ${photo.type === 'AFTER' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {photo.type === 'AFTER' ? 'DEPOIS' : 'ANTES'}
                  </span>
                  <p className="text-[7px] text-zinc-600 truncate mt-0.5">{photo.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="inv-footer">
        <div className="flex flex-col gap-8">
          <div className={`inv-status-box inline-block border ${os.paymentStatus === PaymentStatus.PAGO ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            Financeiro: {os.paymentStatus === PaymentStatus.PAGO ? 'Documento Quitado' : 'Pagamento Pendente'}
            {os.paymentMethod ? ` (${os.paymentMethod})` : ''}
          </div>
          <div className="inv-signature">
            Declaro estar de acordo com os serviços prestados
          </div>
        </div>
        <div className="inv-total-box">
          <label>Valor Total do Investimento</label>
          <p className="total-value">R$ {os.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 w-full text-center opacity-40 px-8">
        <p className="text-[8.5px] font-black uppercase tracking-[0.35em]">
          {fiscal.tradeName} • CNPJ {fiscal.cnpj} • {fiscal.cityState || 'Registro/SP'} • {fiscal.phone || '(13) 99689-2958'}
        </p>
      </div>
    </div>
  );
};

export default Invoice;
