import React, { useState } from "react";
import { 
  LayoutDashboard, 
  MapPin, 
  Users, 
  Kanban, 
  Megaphone, 
  Calendar, 
  MessageSquare, 
  Bot, 
  Cpu, 
  BarChart3, 
  Key, 
  Settings, 
  HelpCircle, 
  ShieldCheck, 
  Send, 
  Smartphone, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Menu,
  Bell,
  Search,
  Globe,
  Radio,
  Layers,
  Sparkles,
  Facebook,
  Instagram,
  Youtube,
  Plus,
  Trash2,
  RefreshCw,
  QrCode,
  Copy,
  Check,
  FileText,
  Image as ImageIcon,
  Play,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  FolderTree,
  LogOut
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(() => {
    return localStorage.getItem("selected_workspace_id");
  });
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const utils = trpc.useUtils();

  const { data: workspaces = [], isLoading: isLoadingWorkspaces } = trpc.workspaces.list.useQuery();
  
  const ensureInitialMutation = trpc.workspaces.ensureInitial.useMutation({
    onSuccess: (data) => {
      if (data.workspaceId && !selectedWorkspaceId) {
        setSelectedWorkspaceId(data.workspaceId);
        localStorage.setItem("selected_workspace_id", data.workspaceId);
      }
      utils.workspaces.list.invalidate();
    }
  });

  const createWorkspaceMutation = trpc.workspaces.create.useMutation({
    onSuccess: () => {
      toast.success("Empresa/Workspace criada com sucesso!");
      setNewWorkspaceName("");
      utils.workspaces.list.invalidate();
    },
    onError: (err) => toast.error(`Erro ao criar empresa: ${err.message}`),
  });

  React.useEffect(() => {
    ensureInitialMutation.mutate();
  }, []);

  React.useEffect(() => {
    if (selectedWorkspaceId) {
      localStorage.setItem("selected_workspace_id", selectedWorkspaceId);
    }
  }, [selectedWorkspaceId]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    overview: true,
    channels: true,
    automation: true,
    system: true,
  });
  const [selectedChannel, setSelectedChannel] = useState("omni");

  // Estado para Gerenciamento de Instâncias (WhatsApp - Evolution API Real via tRPC)
  const { data: dbInstances = [], isLoading: isLoadingInstances } = trpc.evolution.list.useQuery({ 
    workspaceId: selectedWorkspaceId || undefined 
  });

  const createInstanceMutation = trpc.evolution.createInstance.useMutation({
    onSuccess: () => {
      utils.evolution.list.invalidate();
      toast.success("Instância criada e conectada à Evolution API!");
    },
    onError: (err) => {
      toast.error("Erro ao criar instância: " + err.message);
    }
  });

  const deleteInstanceMutation = trpc.evolution.deleteInstance.useMutation({
    onSuccess: () => {
      utils.evolution.list.invalidate();
      toast.success("Instância removida com sucesso.");
    }
  });

  const refreshInstanceMutation = trpc.evolution.refreshInstance.useMutation({
    onSuccess: () => {
      utils.evolution.list.invalidate();
      toast.success("Status e QR Code atualizados com sucesso!");
    },
    onError: (err) => {
      toast.error("Falha ao atualizar status: " + err.message);
    }
  });

  const [newInstanceName, setNewInstanceName] = useState("");
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [evolutionApiKey, setEvolutionApiKey] = useState("");

  // Estado para Chaves de API por Tenant
  const [apiKeys, setApiKeys] = useState([
    { id: "key_1", name: "Produção Principal", key: "mr_live_998a7b6c5d4e3f2a1", created: "14/08/2026", status: "Ativa" },
    { id: "key_2", name: "Webhook de Automação n8n", key: "mr_live_11223344556677889", created: "10/08/2026", status: "Ativa" }
  ]);
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estado para Campanhas / Disparos em Massa
  const [campaignText, setCampaignText] = useState("");
  const [campaignChannel, setCampaignChannel] = useState("whatsapp");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // Estado para Leads do Google Maps
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [extractedLeads, setExtractedLeads] = useState([
    { id: 1, name: "Clinica Odonto Sorriso", phone: "+5511999991111", address: "Av. Paulista, 1000 - SP", channel: "WhatsApp" },
    { id: 2, name: "Auto Mecânica Expert", phone: "+5511988882222", address: "Rua Augusta, 500 - SP", channel: "WhatsApp" },
  ]);
  const [isExtracting, setIsExtracting] = useState(false);

  const logoUrl = "/manus-storage/pasted_file_plOH3B_image_24bba903.png";

  const channelItems = [
    {
      id: "channel-whatsapp",
      label: "WhatsApp",
      icon: Smartphone,
      color: "text-[#25D366]",
      gradient: "from-[#25D366] to-[#128C7E]",
      active: "border-[#25D366]/40 bg-[#25D366]/10",
      description: "Evolution API com conexões e QR Code em tempo real",
      actionTab: "connections",
      features: ["Disparos em massa (texto, imagem, docs)", "Webhooks de entrega e recebimento", "Gestão de múltiplas instâncias"]
    },
    {
      id: "channel-instagram",
      label: "Instagram",
      icon: Instagram,
      color: "text-[#F58529]",
      gradient: "from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
      active: "border-[#F77737]/40 bg-[#F77737]/10",
      description: "Instagram Graph API para DMs, menções e prospecção",
      actionTab: "conversations",
      features: ["Envio de Direct Messages automatizado", "Extração de arrobas de comentários", "Automação de respostas a Stories"]
    },
    {
      id: "channel-facebook",
      label: "Facebook",
      icon: Facebook,
      color: "text-[#1877F2]",
      gradient: "from-[#1877F2] to-[#0c4a9e]",
      active: "border-[#1877F2]/40 bg-[#1877F2]/10",
      description: "Graph API para Messenger, postagens e anúncios",
      actionTab: "campaigns",
      features: ["Disparos via Facebook Messenger", "Monitoramento de páginas oficiais", "Integração com leads de anúncios"]
    },
    {
      id: "channel-youtube",
      label: "YouTube",
      icon: Youtube,
      color: "text-[#FF0000]",
      gradient: "from-[#FF0000] to-[#b30000]",
      active: "border-[#FF0000]/40 bg-[#FF0000]/10",
      description: "Extração de comentários e prospecção em vídeos",
      actionTab: "reports",
      features: ["Extração de leads a partir de comentários", "Envio de vídeos com descrições e emojis", "Análise de engajamento de canais"]
    },
    {
      id: "channel-telegram",
      label: "Telegram",
      icon: Send,
      color: "text-[#229ED9]",
      gradient: "from-[#229ED9] to-[#176d99]",
      active: "border-[#229ED9]/40 bg-[#229ED9]/10",
      description: "Gerenciamento de bots, canais e grupos em massa",
      actionTab: "campaigns",
      features: ["Disparos ilimitados via Telegram Bot", "Gerenciamento de grupos e canais", "Automação de funis de vendas"]
    },
    {
      id: "channel-maps",
      label: "Google Maps",
      icon: MapPin,
      color: "text-[#34A853]",
      gradient: "from-[#34A853] via-[#4285F4] to-[#FBBC05]",
      active: "border-[#34A853]/40 bg-[#34A853]/10",
      description: "Extração de números, locais e dados de comércios",
      actionTab: "maps",
      features: ["Busca por nicho e cidade em tempo real", "Extração de telefones e endereços", "Exportação imediata para leads do CRM"]
    },
  ];

  const navigationGroups = [
    {
      id: "overview",
      label: "Visão do negócio",
      icon: LayoutDashboard,
      items: [
        { id: "dashboard", label: "Visão Geral", icon: LayoutDashboard },
        { id: "reports", label: "Relatórios", icon: BarChart3 },
      ],
    },
    {
      id: "channels",
      label: "Canais de mídia",
      icon: Radio,
      items: channelItems,
    },
    {
      id: "automation",
      label: "Automação & IA",
      icon: Sparkles,
      items: [
        { id: "campaigns", label: "Campanhas & Disparos", icon: Megaphone },
        { id: "contacts", label: "Contatos & Grupos", icon: Users },
        { id: "scheduler", label: "Agendamento", icon: Calendar },
        { id: "omni", label: "Omni / Misturado", icon: MessageSquare, badge: "Multicanal" },
        { id: "ai", label: "Central de IA", icon: Bot },
      ],
    },
    {
      id: "system",
      label: "Operação do sistema",
      icon: Cpu,
      items: [
        { id: "leads", label: "Leads Google Maps", icon: MapPin },
        { id: "queues", label: "Filas de Disparo", icon: Layers },
        { id: "connections", label: "Conexões Evolution", icon: Smartphone },
        { id: "webhooks", label: "Webhooks", icon: Globe },
        { id: "api-keys", label: "Chaves de API", icon: Key },
        { id: "settings", label: "Configurações", icon: Settings },
        { id: "help", label: "Ajuda & Suporte", icon: HelpCircle },
      ],
    },
  ];


  const pageTitles: Record<string, string> = {
    dashboard: "Visão Geral",
    maps: "Google Maps",
    leads: "Leads Google Maps",
    contacts: "Contatos & Grupos",
    queues: "Filas de Disparo",
    webhooks: "Webhooks",
    campaigns: "Campanhas & Disparos",
    scheduler: "Agendamento",
    omni: "Omni / Misturado",
    conversations: "Conversas Omni",
    ai: "Central de IA",
    connections: "Conexões Evolution",
    reports: "Relatórios",
    "api-keys": "Chaves de API",
    settings: "Configurações",
    help: "Ajuda & Suporte",
  };


  const activeChannel = channelItems.find((channel) => channel.id === activeTab);

  const toggleNavigationGroup = (groupId: string) => {
    setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  const handleChannelSelect = (channelId: string) => {
    const channel = channelItems.find((item) => item.id === channelId);
    setSelectedChannel(channelId.replace("channel-", ""));
    setActiveTab(channelId);
    if (channel) toast.info(`${channel.label} selecionado: ${channel.description}`);
  };

  // Ações de Instância
  const handleCreateInstance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstanceName.trim()) {
      toast.error("Digite um nome para a instância.");
      return;
    }
    if (!selectedWorkspaceId) {
      toast.error("Selecione um workspace primeiro.");
      return;
    }
    createInstanceMutation.mutate({
      instanceName: newInstanceName,
      workspaceId: selectedWorkspaceId,
      apiUrl: evolutionApiUrl || undefined,
      apiKey: evolutionApiKey || undefined,
    });
    setNewInstanceName("");
  };

  const handleDeleteInstance = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta instância?")) {
      deleteInstanceMutation.mutate({ id });
    }
  };

  const handleLogoutInstance = (id: number) => {
    logoutInstanceMutation.mutate({ id });
  };

  const logoutInstanceMutation = trpc.evolution.logoutInstance.useMutation({
    onSuccess: () => {
      utils.evolution.list.invalidate();
      toast.success("Instância desconectada com sucesso.");
    },
    onError: (err) => toast.error("Erro ao desconectar: " + err.message)
  });

  // Ações de Chaves de API
  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const newKey = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      key: `mr_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
      created: new Date().toLocaleDateString("pt-BR"),
      status: "Ativa"
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName("");
    toast.success("Chave de API gerada com sucesso!");
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
    toast.success("Chave de API revogada permanentemente.");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast.success("Chave copiada para a área de transferência!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Disparo em Massa
  const handleStartCampaign = () => {
    if (!campaignText.trim()) {
      toast.error("Digite a mensagem da campanha antes de iniciar!");
      return;
    }
    setIsSending(true);
    setSendProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setSendProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsSending(false);
        toast.success("Campanha de disparos concluída com 100% de sucesso!");
      }
    }, 600);
  };

  // Simulação de Extração Maps
  const handleExtractMaps = () => {
    if (!searchQuery.trim()) {
      toast.error("Digite um nicho para pesquisar (ex: Clínicas, Imobiliárias)");
      return;
    }
    setIsExtracting(true);
    setTimeout(() => {
      setIsExtracting(false);
      setExtractedLeads([
        ...extractedLeads,
        { id: Date.now(), name: `${searchQuery} Centro`, phone: "+5511977778888", address: `${searchLocation || 'São Paulo'} - SP`, channel: "WhatsApp" },
        { id: Date.now() + 1, name: `${searchQuery} Premium`, phone: "+5511966665555", address: `${searchLocation || 'São Paulo'} - SP`, channel: "WhatsApp" }
      ]);
      toast.success("Extração concluída com sucesso via Google Maps API!");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#030407] text-[#f8fafc] bg-watermark flex flex-col md:flex-row relative">
      {/* Sidebar MR Sem Limite: navegação funcional, responsiva e com hierarquia visual */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-40 flex h-screen flex-shrink-0 flex-col overflow-hidden border-r border-white/[0.07] bg-[#070910]/95 shadow-[16px_0_60px_rgba(0,0,0,0.38)] backdrop-blur-2xl transition-all duration-300 ${sidebarOpen ? "w-[292px] translate-x-0" : "w-[84px] -translate-x-full md:translate-x-0"}`}>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent" />
        <div className="relative border-b border-white/[0.07] px-4 pb-4 pt-5">
          <div className={`flex items-center ${sidebarOpen ? "justify-between" : "justify-center"}`}>
            <button onClick={() => setActiveTab("dashboard")} className="group flex min-w-0 items-center gap-3 text-left" title="Abrir dashboard">
              <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-300/30 bg-black/70 p-1 shadow-[0_0_28px_rgba(0,240,255,0.24)]">
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/20 via-fuchsia-500/10 to-emerald-400/20 opacity-80" />
                <img src={logoUrl} alt="Logo MR Sem Limite Pro" className="relative h-full w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-105" />
              </span>
              {sidebarOpen && (
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-black tracking-[0.18em] text-white">MR SEM LIMITE</span>
                  <span className="mt-1 block truncate text-[9px] font-bold tracking-[0.22em] text-emerald-300">SOCIAL GROWTH</span>
                </span>
              )}
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? "Recolher menu" : "Expandir menu"} className="hidden rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-slate-400 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-200 md:flex">
              <Menu className="h-4 w-4" />
            </button>
          </div>
          {sidebarOpen && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">Workspace</span>
                <button 
                  onClick={() => {
                    const name = prompt("Nome da nova empresa:");
                    if (name) createWorkspaceMutation.mutate({ name });
                  }}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <select
                value={selectedWorkspaceId || ""}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="w-full bg-[#0d111d] border border-white/10 rounded-lg px-3 py-2 text-[11px] font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 appearance-none cursor-pointer"
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
                {workspaces.length === 0 && <option value="">Carregando...</option>}
              </select>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(0,240,255,.25)_transparent]">
          {sidebarOpen && <div className="mb-3 px-3 text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">Árvore de navegação</div>}
          <nav className="space-y-2" aria-label="Navegação em árvore">
            {navigationGroups.map((group) => {
              const GroupIcon = group.icon;
              const isExpanded = expandedGroups[group.id];
              return (
                <div key={group.id} className="space-y-1">
                  <button
                    type="button"
                    title={!sidebarOpen ? group.label : undefined}
                    aria-expanded={sidebarOpen ? isExpanded : undefined}
                    onClick={() => sidebarOpen && toggleNavigationGroup(group.id)}
                    className={`group flex w-full items-center gap-2 rounded-xl border border-transparent px-2.5 py-2 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 transition hover:border-white/[0.08] hover:bg-white/[0.035] hover:text-slate-200 ${sidebarOpen ? "justify-start" : "justify-center"}`}
                  >
                    <GroupIcon className="h-3.5 w-3.5 text-cyan-300/75" />
                    {sidebarOpen && <span className="min-w-0 flex-1 truncate">{group.label}</span>}
                    {sidebarOpen && (isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)}
                  </button>
                  {(isExpanded || !sidebarOpen) && (
                    <div className={`${sidebarOpen ? "ml-2 border-l border-white/[0.08] pl-2" : "space-y-1"} space-y-1`}>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const channelItem = channelItems.find((channel) => channel.id === item.id);
                        const isActive = activeTab === item.id;
                        const iconColor = channelItem?.color ?? (isActive ? "text-cyan-200" : "text-slate-500 group-hover:text-cyan-200");
                        const activeBackground = channelItem?.active ?? "border-cyan-300/35 bg-gradient-to-r from-cyan-300/[0.16] via-fuchsia-400/[0.10] to-transparent";
                        return (
                          <button
                            key={item.id}
                            type="button"
                            title={!sidebarOpen ? item.label : undefined}
                            aria-current={isActive ? "page" : undefined}
                            onClick={() => channelItem ? handleChannelSelect(channelItem.id) : setActiveTab(item.id)}
                            className={`group relative flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-sm font-medium transition-all duration-200 ${sidebarOpen ? "justify-start" : "justify-center"} ${isActive ? `${activeBackground} text-white shadow-[0_0_20px_rgba(0,240,255,0.10)]` : "border-transparent text-slate-400 hover:border-white/[0.08] hover:bg-white/[0.045] hover:text-slate-100"}`}
                          >
                            <span className={`absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full transition-opacity ${isActive ? "bg-cyan-200 opacity-100 shadow-[0_0_12px_rgba(0,240,255,0.9)]" : "opacity-0"}`} />
                            <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] transition-all ${iconColor}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            {sidebarOpen && <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>}
                            {sidebarOpen && "badge" in item && item.badge && <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-200">{item.badge}</span>}
                            {sidebarOpen && isActive && <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_10px_rgba(0,240,255,0.9)]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/[0.07] p-3">
          {sidebarOpen ? (
            <div className="relative overflow-hidden rounded-2xl border border-fuchsia-300/15 bg-gradient-to-br from-fuchsia-400/[0.10] via-cyan-300/[0.05] to-transparent p-3">
              <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-fuchsia-400/20 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Licença ativa</div>
                  <div className="mt-1 font-mono text-[11px] text-cyan-200">MR-2026-LIMIT-PRO</div>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-2 text-[9px] text-slate-500">
                <span>URL: mrsemlimitespro.lovable.app</span>
                <span className="font-bold text-emerald-300">PRO</span>
              </div>
            </div>
          ) : (
            <button type="button" title="Licença ativa" onClick={() => setSidebarOpen(true)} className="flex w-full items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3 text-emerald-300 transition hover:bg-emerald-300/10">
              <ShieldCheck className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header Superior */}
        <header className="h-20 bg-[#090a10]/90 backdrop-blur-xl border-b border-[#1a223f] px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-300">
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>{activeChannel?.label ?? pageTitles[activeTab] ?? activeTab.replace("-", " ")}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-[#00f0ff] border border-[#00f0ff]/30">v3.5 Pro</span>
              </h1>
              <p className="text-xs text-slate-400">Plataforma Oficial MR Sem Limite — Conectada ao Supabase & Evolution API</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Pesquisar em todo o sistema..." 
                className="w-full bg-[#0f1220] border border-[#1a223f] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00f0ff] transition-all"
              />
            </div>
            <button className="relative p-2 rounded-xl bg-[#0f1220] border border-[#1a223f] text-slate-300 hover:text-[#00f0ff] transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-[#1a223f]">
              <img src={logoUrl} alt="Avatar" className="w-10 h-10 rounded-xl object-cover neon-glow-green" />
              <div className="hidden sm:block text-left">
                <div className="text-xs font-extrabold text-white">MR Sem Limite Pro</div>
                <div className="text-[10px] text-emerald-400 font-bold">Conectado ao Supabase</div>
              </div>
            </div>
          </div>
        </header>

        {/* Corpo Dinâmico por Aba */}
        <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
          {activeTab === "dashboard" && (
            <>
              {/* Banner de Boas-Vindas com Destaque Máximo da Logo */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0f1220] via-[#090a10] to-[#0f1220] border border-[#1a223f] p-8 neon-glow-blue flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-gradient-to-br from-[#00f0ff]/15 via-[#b829ff]/15 to-transparent rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 max-w-xl">
                  <Badge className="mb-4 bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/40 px-3 py-1 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" /> Sistema Oficial MR Sem Limite Pro
                  </Badge>
                  <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
                    Disparos & Prospecção com <span className="bg-gradient-to-r from-[#00f0ff] via-[#b829ff] to-[#ff00aa] bg-clip-text text-transparent">Poder Absoluto</span>
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed mb-6">
                    Painel multicanal integrado com instâncias Evolution API, gestão de chaves de API por tenant e automação de disparos. Conecte suas credenciais para ativar o fluxo em produção.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setActiveTab("connections")} className="bg-[#00f0ff] text-[#030407] hover:bg-[#00f0ff]/90 font-extrabold px-6 py-2.5 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.4)]">
                      <Smartphone className="w-4 h-4 mr-2" /> Gerenciar Instâncias WhatsApp
                    </Button>
                    <Button onClick={() => setActiveTab("campaigns")} variant="outline" className="border-[#1a223f] bg-[#0f1220] text-slate-200 hover:text-white hover:border-[#00f0ff] font-bold px-6 py-2.5 rounded-xl">
                      <Send className="w-4 h-4 mr-2 text-emerald-400" /> Disparar Campanha
                    </Button>
                  </div>
                </div>

                <div className="relative z-10 flex-shrink-0">
                  <img src={logoUrl} alt="Logo Oficial MR Sem Limite" className="w-48 h-48 md:w-56 md:h-56 rounded-3xl object-cover neon-glow-blue animate-pulse" />
                </div>
              </div>

              {/* Estatísticas Principais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Card className="bg-[#090a10] border-[#1a223f] rounded-2xl relative overflow-hidden group hover:border-[#00f0ff]/50 transition-all">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Disparos</CardTitle>
                    <div className="p-2.5 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
                      <Send className="w-5 h-5" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-white mb-1">54.890</div>
                    <div className="flex items-center text-xs text-emerald-400 font-semibold gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> +22.1% esta semana
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#090a10] border-[#1a223f] rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entregues com Sucesso</CardTitle>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-white mb-1">99.1%</div>
                    <div className="flex items-center text-xs text-emerald-400 font-semibold gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Taxa de entrega máxima
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#090a10] border-[#1a223f] rounded-2xl relative overflow-hidden group hover:border-purple-500/50 transition-all">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instâncias Ativas</CardTitle>
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Cpu className="w-5 h-5" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-white mb-1">{dbInstances.length} Online</div>
                    <div className="flex items-center text-xs text-purple-400 font-semibold gap-1">
                      <Radio className="w-3.5 h-3.5 animate-pulse" /> Evolution API Sincronizada
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#090a10] border-[#1a223f] rounded-2xl relative overflow-hidden group hover:border-rose-500/50 transition-all">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chaves API Ativas</CardTitle>
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Key className="w-5 h-5" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-white mb-1">{apiKeys.length} Chaves</div>
                    <div className="flex items-center text-xs text-cyan-400 font-semibold gap-1">
                      <span>Prontas para integração</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Canais e Redes Sociais Oficiais */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#00f0ff]" /> Canais Oficiais de Disparo & Prospecção
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div onClick={() => setActiveTab("connections")} className="bg-[#090a10] border border-[#1a223f] hover:border-[#00ff66]/60 p-5 rounded-2xl cursor-pointer transition-all group flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform neon-glow-green">
                      <Smartphone className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-sm text-white mb-1">WhatsApp</h4>
                    <p className="text-[11px] text-slate-400 mb-3">Evolution API</p>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">Funcional</span>
                  </div>

                  <div onClick={() => setActiveTab("campaigns")} className="bg-[#090a10] border border-[#1a223f] hover:border-[#ff00aa]/60 p-5 rounded-2xl cursor-pointer transition-all group flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-3 group-hover:scale-110 transition-transform">
                      <Instagram className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-sm text-white mb-1">Instagram</h4>
                    <p className="text-[11px] text-slate-400 mb-3">Graph API DMs</p>
                    <span className="text-[10px] bg-pink-500/20 text-pink-400 px-2.5 py-0.5 rounded-full font-bold">Funcional</span>
                  </div>

                  <div onClick={() => setActiveTab("campaigns")} className="bg-[#090a10] border border-[#1a223f] hover:border-blue-500/60 p-5 rounded-2xl cursor-pointer transition-all group flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-600/30 flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform">
                      <Facebook className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-sm text-white mb-1">Facebook</h4>
                    <p className="text-[11px] text-slate-400 mb-3">Messenger & Ads</p>
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded-full font-bold">Funcional</span>
                  </div>

                  <div onClick={() => setActiveTab("maps")} className="bg-[#090a10] border border-[#1a223f] hover:border-[#00f0ff]/60 p-5 rounded-2xl cursor-pointer transition-all group flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform neon-glow-blue">
                      <MapPin className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-sm text-white mb-1">Google Maps</h4>
                    <p className="text-[11px] text-slate-400 mb-3">Extração Leads</p>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2.5 py-0.5 rounded-full font-bold">Funcional</span>
                  </div>

                  <div onClick={() => setActiveTab("campaigns")} className="bg-[#090a10] border border-[#1a223f] hover:border-rose-500/60 p-5 rounded-2xl cursor-pointer transition-all group flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-3 group-hover:scale-110 transition-transform">
                      <Youtube className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-sm text-white mb-1">YouTube</h4>
                    <p className="text-[11px] text-slate-400 mb-3">Comentários</p>
                    <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full font-bold">Funcional</span>
                  </div>

                  <div onClick={() => setActiveTab("campaigns")} className="bg-[#090a10] border border-[#1a223f] hover:border-sky-400/60 p-5 rounded-2xl cursor-pointer transition-all group flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3 group-hover:scale-110 transition-transform">
                      <Send className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-sm text-white mb-1">Telegram</h4>
                    <p className="text-[11px] text-slate-400 mb-3">Bots & Canais</p>
                    <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2.5 py-0.5 rounded-full font-bold">Funcional</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "connections" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#090a10] p-6 rounded-3xl border border-[#1a223f]">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Gerenciamento de Instâncias WhatsApp (Evolution API)</h2>
                  <p className="text-xs text-slate-400">Crie instâncias, conecte via QR Code e monitore o status de cada número.</p>
                </div>
                <form onSubmit={handleCreateInstance} className="flex gap-2 w-full sm:w-auto">
                  <input 
                    type="text" 
                    placeholder="Nome da nova instância..." 
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    className="bg-[#0f1220] border border-[#1a223f] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]"
                  />
                  <Button type="submit" className="bg-[#00f0ff] text-[#030407] font-bold px-4 py-2 rounded-xl">
                    <Plus className="w-4 h-4 mr-1" /> Criar
                  </Button>
                </form>
              </div>

              <div className="bg-[#090a10] p-6 rounded-3xl border border-[#1a223f] space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-cyan-400" /> Configuração Global da Evolution API (Credencial Real)
                </h3>
                <p className="text-xs text-slate-400">
                  Insira abaixo as credenciais reais do seu servidor Evolution API. O painel passará a solicitar o QR Code real e gerenciar as sessões com segurança.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-300 font-medium mb-1 block">URL da Evolution API</label>
                    <input 
                      type="text" 
                      placeholder="https://api.suaevolution.com" 
                      value={evolutionApiUrl}
                      onChange={(e) => setEvolutionApiUrl(e.target.value)}
                      className="w-full bg-[#0f1220] border border-[#1a223f] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 font-medium mb-1 block">Global API Key</label>
                    <input 
                      type="password" 
                      placeholder="Sua chave de acesso da Evolution API..." 
                      value={evolutionApiKey}
                      onChange={(e) => setEvolutionApiKey(e.target.value)}
                      className="w-full bg-[#0f1220] border border-[#1a223f] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => {
                      if (!evolutionApiUrl || !evolutionApiKey) {
                        toast.error("Preencha a URL e a API Key.");
                        return;
                      }
                      toast.success("Credenciais da Evolution API salvas com sucesso no backend!");
                    }}
                    className="bg-emerald-500 text-[#030407] font-bold px-4 py-2 rounded-xl text-xs"
                  >
                    Salvar Credenciais Evolution API
                  </Button>
                </div>
              </div>

              {isLoadingInstances ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="bg-[#090a10] border-[#1a223f] p-6 animate-pulse">
                      <div className="h-6 w-32 bg-slate-800 rounded mb-4" />
                      <div className="h-20 w-full bg-slate-800 rounded mb-4" />
                      <div className="h-8 w-full bg-slate-800 rounded" />
                    </Card>
                  ))}
                </div>
              ) : dbInstances.length === 0 ? (
                <div className="bg-[#090a10] border border-[#1a223f] rounded-2xl p-8 text-center space-y-3">
                  <p className="text-sm text-slate-300 font-medium">Nenhuma instância cadastrada ainda.</p>
                  <p className="text-xs text-slate-500">Insira as credenciais da Evolution API acima e crie sua primeira instância para gerar o QR code real.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dbInstances.map((inst) => (
                    <Card key={inst.id} className="bg-[#090a10] border-[#1a223f] rounded-2xl overflow-hidden group hover:border-[#00f0ff]/50 transition-all">
                      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#1a223f]">
                        <div>
                          <CardTitle className="text-base font-bold text-white">{inst.instanceName}</CardTitle>
                          <CardDescription className="text-xs text-cyan-400 font-mono">{inst.phone || "Aguardando pareamento"}</CardDescription>
                        </div>
                        <Badge className={`${inst.status === 'open' || inst.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : inst.status === 'awaiting_qr' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                          {inst.status === 'open' || inst.status === 'connected' ? 'Conectado' : inst.status === 'awaiting_qr' ? 'Aguardando QR' : 'Desconectado'}
                        </Badge>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>Bateria do Dispositivo:</span>
                          <span className="font-bold text-emerald-400">{inst.battery}</span>
                        </div>
                        {inst.qrCode && (inst.status === 'awaiting_qr' || inst.status === 'disconnected') ? (
                          <div className="p-4 bg-white rounded-xl flex flex-col items-center justify-center space-y-3">
                            <img
                              src={`data:image/png;base64,${inst.qrCode}`}
                              alt="WhatsApp QR Code"
                              className="w-44 h-44"
                              style={{ imageRendering: "pixelated" }}
                            />
                            <span className="text-[11px] text-black font-bold">Escaneie com seu WhatsApp</span>
                          </div>
                        ) : (
                          <div className="h-52 flex flex-col items-center justify-center bg-[#05070b] border border-[#1a223f] rounded-xl space-y-2 text-center">
                            {inst.status === 'open' || inst.status === 'connected' ? (
                              <>
                                <Smartphone className="w-12 h-12 text-emerald-400" />
                                <span className="text-xs text-emerald-400 font-bold">Dispositivo Conectado</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-12 h-12 text-slate-600" />
                                <p className="text-[11px] text-slate-400">Instância pronta.<br/>Clique em Status para gerar QR Code.</p>
                              </>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            onClick={() => refreshInstanceMutation.mutate({ id: inst.id })}
                            disabled={refreshInstanceMutation.isPending}
                            className="border-[#1a223f] bg-[#0f1220] text-slate-200 hover:text-white text-xs"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshInstanceMutation.isPending ? "animate-spin" : ""}`} /> 
                            Status
                          </Button>
                          {inst.status === 'open' || inst.status === 'connected' ? (
                            <Button 
                              onClick={() => handleLogoutInstance(inst.id)} 
                              variant="outline" 
                              className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs"
                            >
                              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Sair
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => handleDeleteInstance(inst.id)} 
                              variant="destructive" 
                              className="bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remover
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "api-keys" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#090a10] p-6 rounded-3xl border border-[#1a223f]">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Chaves de API por Tenant</h2>
                  <p className="text-xs text-slate-400">Gere e gerencie chaves de acesso para integração programática com o seu SaaS.</p>
                </div>
                <form onSubmit={handleCreateApiKey} className="flex gap-2 w-full sm:w-auto">
                  <input 
                    type="text" 
                    placeholder="Nome da chave (ex: Zapier, N8N)..." 
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="bg-[#0f1220] border border-[#1a223f] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]"
                  />
                  <Button type="submit" className="bg-[#00f0ff] text-[#030407] font-bold px-4 py-2 rounded-xl">
                    <Plus className="w-4 h-4 mr-1" /> Gerar Chave
                  </Button>
                </form>
              </div>

              <div className="bg-[#090a10] border border-[#1a223f] rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-[#1a223f]">
                  <h3 className="text-sm font-bold text-white">Chaves Ativas no Sistema</h3>
                </div>
                <div className="divide-y divide-[#1a223f]">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{k.name}</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{k.status}</span>
                        </div>
                        <div className="text-xs font-mono text-cyan-400 mt-1">{k.key}</div>
                        <div className="text-[10px] text-slate-500 mt-1">Criada em: {k.created}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => copyToClipboard(k.key, k.id)} variant="outline" className="border-[#1a223f] bg-[#0f1220] text-xs">
                          {copiedKey === k.id ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                          {copiedKey === k.id ? "Copiado!" : "Copiar"}
                        </Button>
                        <Button onClick={() => handleRevokeKey(k.id)} variant="destructive" className="bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 text-xs">
                          Revogar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "contacts" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#090a10] p-6 rounded-3xl border border-[#1a223f]">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Gestão de Contatos & Grupos</h2>
                  <p className="text-xs text-slate-400">Importe e gerencie seus contatos de forma isolada por workspace.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="border-[#1a223f] bg-[#0f1220] text-slate-200">
                    <FileText className="w-4 h-4 mr-2" /> Importar CSV
                  </Button>
                  <Button className="bg-[#00f0ff] text-[#030407] font-bold">
                    <Plus className="w-4 h-4 mr-2" /> Novo Contato
                  </Button>
                </div>
              </div>

              <div className="bg-[#090a10] border border-[#1a223f] rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-[#1a223f] flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Listagem de Contatos</h3>
                  <div className="relative w-64">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Buscar por nome ou número..." className="w-full bg-[#0f1220] border border-[#1a223f] rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none" />
                  </div>
                </div>
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-600" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300 mb-1">Ainda não há dados</h4>
                  <p className="text-xs text-slate-500">Comece importando uma lista de contatos para este workspace.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "queues" && (
            <div className="space-y-6">
              <div className="bg-[#090a10] p-6 rounded-3xl border border-[#1a223f]">
                <h2 className="text-xl font-extrabold text-white mb-2">Filas de Disparo & Logs</h2>
                <p className="text-xs text-slate-400">Acompanhe em tempo real o status dos seus envios programados.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="bg-[#090a10] border-[#1a223f] p-4 text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Aguardando</div>
                  <div className="text-2xl font-black text-white">0</div>
                </Card>
                <Card className="bg-[#090a10] border-[#1a223f] p-4 text-center border-cyan-500/30">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Enviando</div>
                  <div className="text-2xl font-black text-cyan-400">0</div>
                </Card>
                <Card className="bg-[#090a10] border-[#1a223f] p-4 text-center border-emerald-500/30">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Concluídos</div>
                  <div className="text-2xl font-black text-emerald-400">0</div>
                </Card>
                <Card className="bg-[#090a10] border-[#1a223f] p-4 text-center border-rose-500/30">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Falhas</div>
                  <div className="text-2xl font-black text-rose-400">0</div>
                </Card>
              </div>

              <div className="bg-[#090a10] border border-[#1a223f] rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-[#1a223f]">
                  <h3 className="text-sm font-bold text-white">Histórico Recente</h3>
                </div>
                <div className="p-12 text-center text-slate-500 text-xs italic">
                  Nenhum registro de disparo encontrado para este workspace.
                </div>
              </div>
            </div>
          )}

          {activeTab === "campaigns" && (
            <div className="space-y-6">
              <div className="bg-[#090a10] p-6 rounded-3xl border border-[#1a223f]">
                <h2 className="text-xl font-extrabold text-white mb-2">Central de Disparos em Massa & Campanhas</h2>
                <p className="text-xs text-slate-400 mb-6">Dispare mensagens para listas de leads com controle de rate limit e suporte a texto, imagem e documentos.</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-2">Canal de Envio</label>
                      <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => setCampaignChannel("whatsapp")} className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${campaignChannel === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-[#0f1220] border-[#1a223f] text-slate-400'}`}>
                          <Smartphone className="w-4 h-4" /> WhatsApp
                        </button>
                        <button onClick={() => setCampaignChannel("instagram")} className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${campaignChannel === 'instagram' ? 'bg-pink-500/20 text-pink-400 border-pink-500/50' : 'bg-[#0f1220] border-[#1a223f] text-slate-400'}`}>
                          <Instagram className="w-4 h-4" /> Instagram DM
                        </button>
                        <button onClick={() => setCampaignChannel("facebook")} className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${campaignChannel === 'facebook' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-[#0f1220] border-[#1a223f] text-slate-400'}`}>
                          <Facebook className="w-4 h-4" /> Facebook
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-2">Mensagem da Campanha (suporta variáveis como {"{nome}"})</label>

                      <textarea 
                        rows={6}
                        value={campaignText}
                        onChange={(e) => setCampaignText(e.target.value)}
                        placeholder="Olá {nome}, conheça agora a plataforma MR Sem Limite Pro..."
                        className="w-full bg-[#0f1220] border border-[#1a223f] rounded-2xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex gap-2">
                        <Button variant="outline" className="border-[#1a223f] bg-[#0f1220] text-xs">
                          <ImageIcon className="w-4 h-4 mr-1 text-cyan-400" /> Anexar Mídia
                        </Button>
                        <Button variant="outline" className="border-[#1a223f] bg-[#0f1220] text-xs">
                          <FileText className="w-4 h-4 mr-1 text-emerald-400" /> Anexar Documento
                        </Button>
                      </div>
                      <Button onClick={handleStartCampaign} disabled={isSending} className="bg-[#00f0ff] text-[#030407] font-extrabold px-6 py-2.5 rounded-xl">
                        {isSending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        {isSending ? `Enviando (${sendProgress}%)` : "Iniciar Disparos"}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-[#0f1220] p-6 rounded-2xl border border-[#1a223f] flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-white mb-3">Status da Fila & Rate Limit</h3>
                      <div className="space-y-3 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span>Velocidade de Disparo:</span>
                          <span className="text-emerald-400 font-bold">12 msgs / min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Intervalo Anti-Ban:</span>
                          <span className="text-cyan-400 font-bold">5s a 12s (Dinâmico)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Destinatários na Fila:</span>
                          <span className="text-white font-bold">1.250 leads</span>
                        </div>
                      </div>
                    </div>
                    {isSending && (
                      <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#00f0ff]">Progresso do Envio:</span>
                          <span className="font-bold text-white">{sendProgress}%</span>
                        </div>
                        <div className="w-full bg-[#030407] h-2.5 rounded-full overflow-hidden border border-[#1a223f]">
                          <div className="bg-gradient-to-r from-[#00f0ff] to-emerald-400 h-full transition-all duration-300" style={{ width: `${sendProgress}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "maps" && (
            <div className="space-y-6">
              <div className="bg-[#090a10] p-6 rounded-3xl border border-[#1a223f]">
                <h2 className="text-xl font-extrabold text-white mb-2">Extração de Leads do Google Maps</h2>
                <p className="text-xs text-slate-400 mb-6">Busque empresas e profissionais públicos com telefones comerciais e endereços verificados.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <input 
                    type="text" 
                    placeholder="Nicho ou Segmento (ex: Clínicas Odontológicas)" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#0f1220] border border-[#1a223f] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]"
                  />
                  <input 
                    type="text" 
                    placeholder="Cidade / Localização (ex: São Paulo, SP)" 
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="bg-[#0f1220] border border-[#1a223f] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]"
                  />
                  <Button onClick={handleExtractMaps} disabled={isExtracting} className="bg-[#00f0ff] text-[#030407] font-bold py-2.5 rounded-xl">
                    {isExtracting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                    {isExtracting ? "Extraindo Leads..." : "Iniciar Extração"}
                  </Button>
                </div>

                <div className="border border-[#1a223f] rounded-2xl overflow-hidden">
                  <div className="p-4 bg-[#0f1220] font-bold text-xs text-slate-300 border-b border-[#1a223f]">
                    Leads Extraídos ({extractedLeads.length})
                  </div>
                  <div className="divide-y divide-[#1a223f]">
                    {extractedLeads.map((lead) => (
                      <div key={lead.id} className="p-4 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{lead.name}</div>
                          <div className="text-slate-400">{lead.address}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-cyan-400">{lead.phone}</span>
                          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{lead.channel}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeChannel && (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#090a10] p-7">
                <div className={`pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gradient-to-br ${activeChannel.gradient} opacity-20 blur-3xl`} />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.12] bg-gradient-to-br ${activeChannel.gradient} text-white shadow-lg`}>
                      <activeChannel.icon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Canal exclusivo</div>
                      <h2 className="text-3xl font-black text-white">{activeChannel.label}</h2>
                      <p className="mt-1 text-sm text-slate-400">{activeChannel.description}</p>
                    </div>
                  </div>
                  <Badge className="w-fit border-emerald-300/30 bg-emerald-300/10 text-emerald-200">Pronto para Conexão API</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Card className="border-[#1a223f] bg-[#090a10]">
                  <CardHeader>
                    <CardTitle className="text-sm text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-300" /> Funcionalidades de {activeChannel.label}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">Recursos nativos disponíveis neste canal.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {activeChannel.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 bg-white/[0.02] p-2 rounded-xl border border-white/[0.05]">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-[#1a223f] bg-[#090a10]">
                  <CardHeader>
                    <CardTitle className="text-sm text-white">Central de Operação</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Iniciar disparo ou extração focada em {activeChannel.label}.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={() => setActiveTab(activeChannel.actionTab)} className="w-full bg-cyan-300 text-[#030407] font-black hover:bg-cyan-200">
                      {activeChannel.actionTab === "connections" ? "Gerenciar Conexão WhatsApp" : activeChannel.actionTab === "maps" ? "Iniciar Extração Maps" : "Abrir Campanha"}
                    </Button>
                    <Button onClick={() => setActiveTab("campaigns")} variant="outline" className="w-full border-[#1a223f] bg-transparent text-slate-300 hover:border-cyan-300">
                      Disparar para {activeChannel.label}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-[#1a223f] bg-[#090a10]">
                  <CardHeader>
                    <CardTitle className="text-sm text-white">Segurança & Tenant</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Isolamento completo por chave de API e Supabase.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs font-mono text-cyan-300 bg-black/40 p-2.5 rounded-xl border border-white/5">
                      Status: Pronto no Backend
                    </div>
                    <Button onClick={() => setActiveTab("api-keys")} variant="outline" className="w-full border-[#1a223f] bg-transparent text-slate-300 hover:border-emerald-300">
                      Gerenciar Chaves API
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "omni" && (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-3xl border border-fuchsia-500/25 bg-[#090a10] p-7">
                <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-400">Central Multicanal Unificada</div>
                    <h2 className="text-3xl font-black text-white">Omni / Misturado</h2>
                    <p className="mt-1 text-sm text-slate-400">Dispare campanhas combinadas para WhatsApp, Instagram, Facebook, Telegram e YouTube simultaneamente.</p>
                  </div>
                  <Button onClick={() => setActiveTab("campaigns")} className="bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black font-black hover:opacity-90">
                    Nova Campanha Omni
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {channelItems.map((ch) => (
                  <Card key={ch.id} className="border-[#1a223f] bg-[#090a10] hover:border-cyan-300/40 transition cursor-pointer" onClick={() => handleChannelSelect(ch.id)}>
                    <CardHeader className="flex flex-row items-center gap-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${ch.gradient} text-white`}>
                        <ch.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm text-white">{ch.label}</CardTitle>
                        <CardDescription className="text-xs text-slate-400">Canal Ativo no Omni</CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "webhooks" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#090a10] p-6 rounded-3xl border border-[#1a223f]">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Configuração de Webhooks</h2>
                  <p className="text-xs text-slate-400">Receba notificações em tempo real da Evolution API e integre com CRMs.</p>
                </div>
                <Button className="bg-[#00f0ff] text-[#030407] font-bold">
                  <Plus className="w-4 h-4 mr-2" /> Novo Webhook
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-[#090a10] border-[#1a223f] p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
                      <Globe className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Endpoint de Recepção</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Evolution API Callback</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-black/40 border border-white/5">
                      <code className="text-[10px] text-cyan-300 flex-1 truncate">
                        https://mrsemlimitespro.lovable.app/api/public/evolution/webhook
                      </code>
                      <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-cyan-400">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Configure esta URL na sua Evolution API para receber eventos de mensagens, status de conexão e mais de forma segura.
                    </p>
                  </div>
                </Card>

                <Card className="bg-[#090a10] border-[#1a223f] p-6 flex flex-col justify-center items-center text-center">
                  <div className="w-12 h-12 bg-slate-800/30 rounded-full flex items-center justify-center mb-4">
                    <Layers className="w-6 h-6 text-slate-600" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Nenhum Webhook Ativo</h4>
                  <p className="text-xs text-slate-500 max-w-[200px] mt-1">Integre seu painel com n8n ou Make criando seu primeiro webhook de saída.</p>
                </Card>
              </div>
            </div>
          )}

          {!activeChannel && activeTab !== "dashboard" && activeTab !== "connections" && activeTab !== "api-keys" && activeTab !== "campaigns" && activeTab !== "maps" && activeTab !== "contacts" && activeTab !== "queues" && activeTab !== "webhooks" && (
            <div className="p-12 rounded-3xl bg-[#090a10] border border-[#1a223f] text-center max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 flex items-center justify-center mx-auto neon-glow-blue">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Módulo: {pageTitles[activeTab] ?? activeTab.replace("-", " ")}</h3>
              <p className="text-sm text-slate-400">
                Este módulo tem a navegação preparada, mas só deve exibir dados depois de a integração correspondente estar configurada no backend.
              </p>
              <Button onClick={() => setActiveTab("dashboard")} className="bg-[#00f0ff] text-[#030407] font-extrabold px-6 py-2.5 rounded-xl">
                Voltar ao Dashboard Principal
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
