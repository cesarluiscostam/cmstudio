/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../lib/ui';
import { CompanySettings } from '../types';
import {
  Settings,
  Clock,
  Calendar,
  Globe,
  Copy,
  Check,
  Instagram,
  MapPin,
  Smartphone,
  ExternalLink,
  Save,
  MessageSquare,
  Building,
  Upload,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';

interface ConfiguracoesViewProps {
  company: any;
  user: any;
  refreshTrigger: number;
  onRefresh: () => void;
  onCompanyUpdate: (company: any) => void;
}

export default function ConfiguracoesView({ company, user, refreshTrigger, onRefresh, onCompanyUpdate }: ConfiguracoesViewProps) {
  const showToast = useToast();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');
  const [uploadingCoverPhoto, setUploadingCoverPhoto] = useState(false);
  const [coverPhotoUploadError, setCoverPhotoUploadError] = useState('');

  // Form states
  const [workDays, setWorkDays] = useState<number[]>([]);
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('19:00');
  const [lunchStart, setLunchStart] = useState('12:00');
  const [lunchEnd, setLunchEnd] = useState('13:00');
  const [slotIntervalMin, setSlotIntervalMin] = useState(30);
  const [allowOnlineBooking, setAllowOnlineBooking] = useState(true);

  // Shop Profile info (company table) - now fully editable for Managers/Admins
  const [shopName, setShopName] = useState(company?.name || '');
  const [shopPhone, setShopPhone] = useState(company?.phone || '');
  const [shopAddress, setShopAddress] = useState(company?.address || '');
  const [shopInstagram, setShopInstagram] = useState(company?.instagram || '');
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl || '');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(company?.coverPhotoUrl || '');
  const [businessType, setBusinessType] = useState(company?.businessType || 'barbershop');
  const [primaryColor, setPrimaryColor] = useState(company?.primaryColor || '#ba8b3f');
  const [secondaryColor, setSecondaryColor] = useState(company?.secondaryColor || '#6f2f40');

  useEffect(() => {
    if (company) {
      setShopName(company.name || '');
      setShopPhone(company.phone || '');
      setShopAddress(company.address || '');
      setShopInstagram(company.instagram || '');
      setLogoUrl(company.logoUrl || '');
      setCoverPhotoUrl(company.coverPhotoUrl || '');
      setBusinessType(company.businessType || 'barbershop');
      setPrimaryColor(company.primaryColor || '#ba8b3f');
      setSecondaryColor(company.secondaryColor || '#6f2f40');
    }
  }, [company]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
      if (data) {
        setWorkDays(data.workDays);
        setOpenTime(data.openTime);
        setCloseTime(data.closeTime);
        setLunchStart(data.lunchStart || '');
        setLunchEnd(data.lunchEnd || '');
        setSlotIntervalMin(data.slotIntervalMin);
        setAllowOnlineBooking(data.allowOnlineBooking);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [refreshTrigger, company]);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploadError('');
    try {
      setUploadingLogo(true);
      const data = await api.uploadCompanyLogo(file);
      setLogoUrl(data.logoUrl);
    } catch (err: any) {
      setLogoUploadError(err.message || 'Erro ao enviar a imagem.');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleCoverPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverPhotoUploadError('');
    try {
      setUploadingCoverPhoto(true);
      const data = await api.uploadCompanyCoverPhoto(file);
      setCoverPhotoUrl(data.coverPhotoUrl);
    } catch (err: any) {
      setCoverPhotoUploadError(err.message || 'Erro ao enviar a imagem.');
    } finally {
      setUploadingCoverPhoto(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Save general operational configurations
      await api.updateSettings({
        workDays,
        openTime,
        closeTime,
        lunchStart,
        lunchEnd,
        slotIntervalMin,
        allowOnlineBooking
      });

      // 2. Save company brand customization (Manager specific requirement)
      const updatedCompany = await api.updateCompanyProfile({
        name: shopName,
        logoUrl,
        coverPhotoUrl,
        businessType,
        primaryColor,
        secondaryColor,
        phone: shopPhone,
        address: shopAddress,
        instagram: shopInstagram
      });

      // Reflect the change immediately across the app (sidebar, header, brand colors)
      // instead of leaving the UI stale until a manual reload.
      onCompanyUpdate(updatedCompany);

      showToast('Configurações operacionais e identidade visual salvas com sucesso!');
      onRefresh();
    } catch (err) {
      showToast('Erro ao salvar configurações.', 'error');
    }
  };

  const toggleDay = (day: number) => {
    if (workDays.includes(day)) {
      setWorkDays(workDays.filter(d => d !== day));
    } else {
      setWorkDays([...workDays, day].sort());
    }
  };

  // Build the public booking url relative to where the current app is hosted
  // If we run in the AI Studio preview, we can read window.location.origin
  const publicSlug = company?.slug || 'barberflow';
  const publicBookingUrl = `${window.location.origin}/#/agendar/${publicSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicBookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const daysOfWeek = [
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' },
    { value: 0, label: 'Dom' }
  ];

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Public Scheduling Hub Card */}
      <div className="bg-rail text-paper p-6 rounded-[22px_8px_22px_8px] border border-brass-soft shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="px-2 py-0.5 bg-brand-primary/15 text-brand-primary text-[10px] font-bold uppercase rounded-md tracking-wider">
              Área do Cliente Online
            </span>
            <h2 className="text-xl font-display font-bold">Portal de Agendamentos Online</h2>
            <p className="text-xs text-paper/60">Seus clientes podem marcar horários sozinhos sem login ou aplicativo.</p>
          </div>
          <Globe className="h-8 w-8 text-paper/40" />
        </div>

        <div className="bg-white/5 p-4 rounded-lg border border-brass-soft space-y-3">
          <p className="text-xs font-semibold text-paper/60 uppercase tracking-wider">SEU LINK EXCLUSIVO DE AGENDAMENTO:</p>
          <div className="flex items-center gap-2 bg-ink/20 border border-brass-soft rounded-lg p-2.5 overflow-hidden">
            <span className="text-xs font-mono text-paper/80 truncate flex-1">{publicBookingUrl}</span>
            <button
              onClick={handleCopyLink}
              className="p-1.5 bg-white/10 text-paper rounded-md hover:bg-white/20 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold flex-shrink-0"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-2">
          <span className="text-paper/60 font-semibold">
            Status: {allowOnlineBooking ? (
              <span className="text-emerald-400 font-bold">✓ Reservas abertas</span>
            ) : (
              <span className="text-red-400 font-bold">Desativado</span>
            )}
          </span>
          <a
            href={publicBookingUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-brand-primary font-semibold hover:underline"
          >
            Visualizar Página <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Main Configurations Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Col 1: Shop Profile Info */}
        <div className="bg-card p-6 rounded-xl border border-ink/10 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-ink flex items-center gap-1.5 border-b border-ink/10 pb-3">
            <Building className="h-4 w-4 text-ink-dim" /> Identidade & Customização
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-dim mb-1">NOME DO ESTABELECIMENTO</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full border border-ink/10 p-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary bg-card text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-dim mb-1">TELEFONE DE ATENDIMENTO</label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-dim">
                  <Smartphone className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  className="w-full border border-ink/10 pl-9 pr-3 py-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary bg-card text-ink"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-dim mb-1">ENDEREÇO COMPLETO</label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-dim">
                  <MapPin className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="Rua, Número - Bairro, Cidade"
                  className="w-full border border-ink/10 pl-9 pr-3 py-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary bg-card text-ink"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-dim mb-1">INSTAGRAM</label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-dim">
                  <Instagram className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={shopInstagram}
                  onChange={(e) => setShopInstagram(e.target.value)}
                  className="w-full border border-ink/10 pl-9 pr-3 py-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary bg-card text-ink"
                />
              </div>
            </div>

            <div className="border-t border-ink/8 pt-4 space-y-4">
              <span className="text-[10px] font-black text-ink-dim uppercase tracking-widest block">Identidade Visual & Cores</span>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">LOGOTIPO DA EMPRESA</label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg border border-ink/10 bg-paper flex items-center justify-center overflow-hidden flex-shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Building className="h-5 w-5 text-ink-dim/50" />
                    )}
                  </div>
                  <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-ink/20 rounded-lg text-xs font-semibold text-ink-dim hover:border-brand-primary hover:text-brand-primary transition cursor-pointer">
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" /> Enviar imagem
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoFileChange}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                </div>
                {logoUploadError && (
                  <p className="text-[10px] text-red-600 font-semibold mt-1">{logoUploadError}</p>
                )}
                <p className="text-[10px] text-ink-dim mt-1">PNG, JPG, WEBP ou SVG, até 2MB. Clique em "Salvar Configurações" para aplicar.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">FOTO DE CAPA (PÁGINA DE AGENDAMENTO)</label>
                <div className="space-y-2">
                  <div className="h-20 w-full rounded-lg border border-ink/10 bg-paper flex items-center justify-center overflow-hidden">
                    {coverPhotoUrl ? (
                      <img src={coverPhotoUrl} alt="Foto de capa" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-ink-dim/50" />
                    )}
                  </div>
                  <label className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-ink/20 rounded-lg text-xs font-semibold text-ink-dim hover:border-brand-primary hover:text-brand-primary transition cursor-pointer">
                    {uploadingCoverPhoto ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" /> Enviar foto de capa
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleCoverPhotoFileChange}
                      disabled={uploadingCoverPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
                {coverPhotoUploadError && (
                  <p className="text-[10px] text-red-600 font-semibold mt-1">{coverPhotoUploadError}</p>
                )}
                <p className="text-[10px] text-ink-dim mt-1">Aparece como fundo na página pública de agendamento. PNG, JPG ou WEBP, até 5MB.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">RAMO DE ATUAÇÃO</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-xs font-semibold bg-card text-ink-dim focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="barbershop">Barbearia</option>
                  <option value="beauty_salon">Salão de Beleza / Estética</option>
                  <option value="manicure">Manicure & Unhas</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-ink-dim mb-1">COR PRIMÁRIA</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-8 w-8 rounded cursor-pointer border border-ink/10 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full border border-ink/10 p-1 rounded text-[10px] font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-ink-dim mb-1">COR SECUNDÁRIA</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-8 w-8 rounded cursor-pointer border border-ink/10 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full border border-ink/10 p-1 rounded text-[10px] font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live preview: how these colors will actually look once saved (buttons, badges, active states) */}
              <div>
                <label className="block text-[10px] font-black text-ink-dim mb-1.5">PRÉVIA</label>
                <div
                  className="rounded-lg border border-ink/10 p-3 space-y-2.5 bg-paper-dim/50"
                  style={{ '--color-brand-primary': primaryColor, '--color-brand-secondary': secondaryColor } as React.CSSProperties}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-brand-primary text-white flex items-center justify-center shadow-sm">
                      <Building className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-brand-primary">{shopName || 'Sua Empresa'}</span>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 bg-brand-primary text-white text-[11px] font-bold rounded-lg shadow-xs cursor-default"
                  >
                    Botão de exemplo
                  </button>
                  <div
                    className={`relative rounded-lg p-2.5 text-white text-[10px] font-semibold overflow-hidden ${!coverPhotoUrl ? 'bg-gradient-to-r from-brand-secondary to-brand-primary' : ''}`}
                    style={coverPhotoUrl ? { backgroundImage: `url(${coverPhotoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  >
                    {coverPhotoUrl && <div className="absolute inset-0 bg-ink/50" />}
                    <span className="relative">Banner de exemplo (como o cliente vê ao agendar online)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Operational Schedule Parameters */}
        <div className="bg-card p-6 rounded-xl border border-ink/10 shadow-sm space-y-5 md:col-span-2">
          <h3 className="text-sm font-bold text-ink flex items-center gap-1.5 border-b border-ink/10 pb-3">
            <Clock className="h-4 w-4 text-ink-dim" /> Agenda & Horários de Funcionamento
          </h3>

          <div className="space-y-5">
            {/* Work days selectors */}
            <div>
              <label className="block text-xs font-bold text-ink-dim mb-2">DIAS DE TRABALHO</label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map(day => {
                  const isChecked = workDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${isChecked ? 'bg-brand-primary border-brand-primary text-white shadow-2xs' : 'bg-card border-ink/10 text-ink-dim hover:bg-paper'}`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hours configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">HORÁRIO DE ABERTURA</label>
                <input
                  type="time"
                  required
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">HORÁRIO DE FECHAMENTO</label>
                <input
                  type="time"
                  required
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>

            {/* Lunch Hour Break */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">INTERVALO ALMOÇO (INÍCIO)</label>
                <input
                  type="time"
                  value={lunchStart}
                  onChange={(e) => setLunchStart(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">INTERVALO ALMOÇO (FIM)</label>
                <input
                  type="time"
                  value={lunchEnd}
                  onChange={(e) => setLunchEnd(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>

            {/* Slot interval and toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-ink/10 pt-4">
              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">INTERVALO ENTRE AGENDAMENTOS</label>
                <select
                  value={slotIntervalMin}
                  onChange={(e) => setSlotIntervalMin(Number(e.target.value))}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary bg-card"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>1 hora (60 min)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-2">AGENDAMENTO ONLINE ATIVO</label>
                <label className="flex items-center gap-2.5 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={allowOnlineBooking}
                    onChange={(e) => setAllowOnlineBooking(e.target.checked)}
                    className="rounded accent-brand-primary focus:ring-brand-primary h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-ink-dim">Permitir auto-agendamento</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition cursor-pointer shadow-xs"
              >
                <Save className="h-4 w-4" /> Salvar Configurações
              </button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
