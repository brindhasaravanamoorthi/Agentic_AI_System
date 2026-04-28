import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  User,
  Send,
  Loader,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  MessageSquare,
  Trash2,
  Package,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
  PackagePlus,
  Lightbulb,
  AtSign,
} from 'lucide-react';
import aiOrb from '../assets/ai-orb.gif';
import {
  sendChatMessageStream,
  getChatSessions,
  getChatSession,
  deleteChatSession,
  submitDecision,
} from '../lib/api';
import { MarkdownBlock } from '../components/MarkdownBlock';
import { ProductCard } from '../components/ProductCard';

const AVAILABLE_AGENTS = [
  { id: 'warden', name: 'Warden', desc: 'Monitoring & detection' },
  { id: 'finance', name: 'Finance', desc: 'Budget & approval' },
  { id: 'consensus', name: 'Consensus', desc: 'Vote evaluation' },
  { id: 'proposal', name: 'Proposal', desc: 'Action proposals' },
];

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'system',
  content:
    "Welcome to OmniAgent! Ask me anything about your store, inventory, or customers. I'll coordinate with my team of agents to help you.",
  timestamp: new Date(),
};

export default function ChatPage() {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingAgent, setThinkingAgent] = useState(null);
  const [pendingMessageId, setPendingMessageId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);
  const [atMentionOpen, setAtMentionOpen] = useState(false);
  const [atMentionQuery, setAtMentionQuery] = useState('');
  const [highlightedAgentId, setHighlightedAgentId] = useState(null);
  const [atMentionFocusedIndex, setAtMentionFocusedIndex] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const atMentionRef = useRef(null);
  const atMentionStartRef = useRef(0);
  const sendAbortRef = useRef(null);
  const contentDebounceRef = useRef(null);
  const pendingContentRef = useRef('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const res = await getChatSessions();
      setSessions(res.data?.data || []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (atMentionRef.current && !atMentionRef.current.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setAtMentionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSession = useCallback(async (sessionId) => {
    try {
      const res = await getChatSession(sessionId);
      const data = res.data?.data;
      if (!data) return;
      setCurrentSessionId(sessionId);
      const msgs = (data.messages || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        decision: m.decision,
        analysis: m.analysis,
        productCards: m.productCards ?? m.decision?.productCards,
      }));
      setMessages(msgs.length ? msgs : [WELCOME_MESSAGE]);
    } catch {
      setMessages([WELCOME_MESSAGE]);
    }
  }, []);

  const startNewChat = useCallback(async () => {
    setCurrentSessionId(null);
    setMessages([WELCOME_MESSAGE]);
    setInput('');
  }, []);

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await deleteChatSession(sessionId);
      await loadSessions();
      if (currentSessionId === sessionId) {
        startNewChat();
      }
    } catch {
      // ignore
    }
  };

  const flushContentUpdate = useCallback((assistantId, content) => {
    if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
    contentDebounceRef.current = null;
    pendingContentRef.current = '';
    setMessages((prev) =>
      prev.map((m) => (m.id === assistantId ? { ...m, content } : m))
    );
  }, []);

  const scheduleContentUpdate = useCallback((assistantId, content) => {
    pendingContentRef.current = content;
    if (contentDebounceRef.current) return;
    contentDebounceRef.current = setTimeout(() => {
      contentDebounceRef.current = null;
      const toFlush = pendingContentRef.current;
      pendingContentRef.current = '';
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: toFlush } : m))
      );
    }, 80);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    sendAbortRef.current?.abort();
    sendAbortRef.current = new AbortController();

    const userContent = input.trim();
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setPendingMessageId(assistantId);

    try {
      setThinkingAgent('Warden');

      let content = '';
      let decision;
      let analysis;

      for await (const event of sendChatMessageStream(userContent, currentSessionId, {
        signal: sendAbortRef.current?.signal,
        timeoutMs: 120000,
        agentIds: selectedAgentIds.length > 0 ? selectedAgentIds : undefined,
      })) {
        if (event.type === 'agent_started' && event.agent) {
          setThinkingAgent(event.agent);
        } else if (event.type === 'delta' && event.content) {
          content += (content ? '\n\n' : '') + event.content;
          scheduleContentUpdate(assistantId, content);
        } else if (event.type === 'analysis' && event.analysis) {
          flushContentUpdate(assistantId, content);
          analysis = event.analysis;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, analysis } : m))
          );
        } else if (event.type === 'decision' && event.decision) {
          flushContentUpdate(assistantId, content);
          decision = event.decision;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, decision } : m))
          );
        } else if (event.type === 'sessionId' && event.sessionId) {
          setCurrentSessionId(event.sessionId);
          loadSessions();
        } else if (event.type === 'productCards' && event.productCards?.length) {
          flushContentUpdate(assistantId, content);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, productCards: event.productCards } : m
            )
          );
        } else if (event.type === 'done') {
          flushContentUpdate(assistantId, content);
        }
      }
    } catch (error) {
      if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
      contentDebounceRef.current = null;
      const isAbort = error?.name === 'AbortError' || error?.message?.includes?.('abort');
      const errMsg = isAbort
        ? 'Request was cancelled.'
        : (error?.message || 'Failed to send message. Make sure the backend is running.');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, role: 'system', content: `Error: ${errMsg}` }
            : m
        )
      );
    } finally {
      setThinkingAgent(null);
      setPendingMessageId(null);
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (atMentionOpen) {
      if (e.key === 'Escape') {
        setAtMentionOpen(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAtMentionFocusedIndex((i) => Math.min(i + 1, filteredAgents.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAtMentionFocusedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const agent = filteredAgents[atMentionFocusedIndex];
        if (agent) selectAgent(agent);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setInput(v);
    const cursorPos = e.target.selectionStart;
    const beforeCursor = v.slice(0, cursorPos);
    const lastAt = beforeCursor.lastIndexOf('@');
    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(v[lastAt - 1]))) {
      atMentionStartRef.current = lastAt;
      const query = beforeCursor.slice(lastAt + 1).split(/\s/)[0] || '';
      setAtMentionQuery(query.toLowerCase());
      setAtMentionOpen(true);
    } else {
      setAtMentionOpen(false);
    }
  };

  const selectAgent = (agent) => {
    const el = inputRef.current;
    if (!el) return;
    const start = atMentionStartRef.current;
    const cursorPos = el.selectionStart;
    const before = input.slice(0, start);
    const after = input.slice(cursorPos);
    const mention = `@${agent.name} `;
    const newValue = before + mention + after;
    setInput(newValue);
    setSelectedAgentIds((prev) =>
      prev.includes(agent.id) ? prev : [...prev, agent.id]
    );
    setAtMentionOpen(false);
    setHighlightedAgentId(agent.id);
    setTimeout(() => setHighlightedAgentId(null), 1500);
    requestAnimationFrame(() => {
      el.focus();
      const newPos = start + mention.length;
      el.setSelectionRange(newPos, newPos);
    });
  };

  const toggleAgent = (agentId) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const filteredAgents = AVAILABLE_AGENTS.filter(
    (a) => !atMentionQuery || a.name.toLowerCase().includes(atMentionQuery) || a.id.includes(atMentionQuery)
  );

  useEffect(() => {
    if (atMentionOpen) setAtMentionFocusedIndex(0);
  }, [atMentionOpen, atMentionQuery]);

  const atMentionItemRefs = useRef([]);
  useEffect(() => {
    atMentionItemRefs.current[atMentionFocusedIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [atMentionFocusedIndex, atMentionOpen]);

  const getDecisionClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 border-green-500/40 text-green-300';
      case 'rejected':
        return 'bg-red-500/20 border-red-500/40 text-red-300';
      default:
        return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
    }
  };

  const getDecisionIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const handleDecision = async (messageId, decisionId, approved) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.decision
          ? { ...m, decision: { ...m.decision, decisionResolving: true } }
          : m
      )
    );
    try {
      const res = await submitDecision(decisionId, approved);
      const result = res.data?.data?.result;
      const productCards = res.data?.data?.productCards;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.decision
            ? {
              ...m,
              decision: {
                ...m.decision,
                status: approved ? 'approved' : 'rejected',
                decisionResolving: false,
                decisionResult: result,
                ...(productCards?.length && { productCards }),
              },
              productCards: productCards ?? m.productCards,
            }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.decision
            ? { ...m, decision: { ...m.decision, decisionResolving: false } }
            : m
        )
      );
    }
  };

  const renderMessageContent = (message) => {
    if (message.role === 'user') {
      return <p className="whitespace-pre-wrap">{message.content}</p>;
    }
    return (
      <MarkdownBlock
        content={message.content}
        className=""
      />
    );
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0a0e1a]">
      {/* Sidebar */}
      <div className="w-64 bg-[#0d1324] border-r border-slate-800/50 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
          <h2 className="font-bold text-slate-300 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#3b82f6]" /> Chat History
          </h2>
          <button
            onClick={startNewChat}
            className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-[#3b82f6] bg-[#3b82f6]/20 hover:bg-[#3b82f6]/30 rounded-lg transition-colors"
            title="New chat"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sessionsLoading ? (
            <div className="text-center py-4 text-slate-500 text-sm">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-sm">No chats yet</div>
          ) : (
            <ul className="space-y-1">
              {sessions.map((s) => (
                <li key={s.id} className="group relative">
                  <button
                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${currentSessionId === s.id ? 'bg-[#3b82f6]/20 text-white border border-[#3b82f6]/40' : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
                      }`}
                    onClick={() => loadSession(s.id)}
                  >
                    <span className="font-medium truncate block pr-6">{s.title}</span>
                    <span className="text-xs text-slate-500 block mt-1">
                      {s._count.messages} msgs · {formatDate(s.updatedAt)}
                    </span>
                  </button>
                  <button
                    className="absolute right-2 top-3 p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    title="Delete chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col bg-[#0a0e1a]">
        <div className="bg-[#0d1324]/80 border-b border-slate-800/50 p-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#3b82f6]" /> Agent Chat
          </h1>
          <p className="text-sm text-slate-400">
            {currentSessionId ? 'Continuing conversation' : 'Start a new conversation'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length === 1 && messages[0]?.id === 'welcome' && (
            <div className="mx-auto w-40 h-40 md:w-48 md:h-48 flex justify-center overflow-clip rounded-full border-0 border-blue-500 border-t-2 drop-shadow-[0_0_30px_rgba(59,130,246,0.25)]">
              <img
                src={aiOrb}
                alt="OmniAgent AI"
                className="h-full w-full object-cover rounded-full"
              />
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.role === 'user' ? 'bg-slate-700' : 'bg-[#3b82f6]/30'
                }`}>
                {message.role === 'user' ? <User className="w-5 h-5 text-slate-300" /> : <Bot className="w-5 h-5 text-[#3b82f6]" />}
              </div>

              <div className={`flex flex-col max-w-[85%] md:max-w-2xl ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-5 py-3 ${message.role === 'user'
                  ? 'bg-[#3b82f6] text-white rounded-tr-none'
                  : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-none'
                  }`}>
                  {message.content ? (
                    renderMessageContent(message)
                  ) : loading && thinkingAgent && message.id === pendingMessageId ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span className="font-medium text-white">{thinkingAgent}</span>
                      <span>is thinking...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Agents are thinking...</span>
                    </div>
                  )}
                </div>

                {message.decision && (
                  <div className={`mt-2 p-3 rounded-lg border text-sm w-full ${getDecisionClass(message.decision.status)}`}>
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {getDecisionIcon(message.decision.status)}
                      <span>
                        Decision: {message.decision.status === 'pending_user' ? 'AWAITING YOUR APPROVAL' : message.decision.status.toUpperCase()}
                      </span>
                    </div>

                    {message.decision.recommendedByAgents && (
                      <div className="text-xs opacity-75 mb-2">
                        Agents recommend: {message.decision.recommendedByAgents}
                      </div>
                    )}

                    {message.decision.proposedAction?.actionType && message.decision.proposedAction.actionType !== 'none' && (
                      <div className="text-xs mb-2 bg-slate-800/50 p-1.5 rounded inline-block">
                        Action: {message.decision.proposedAction.actionType.replace(/_/g, ' ')}
                      </div>
                    )}

                    {message.decision.status === 'pending_user' && message.decision.decisionId && !message.decision.decisionResolving && (
                      <div className="flex gap-2 mt-2">
                        <button
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                          onClick={() => handleDecision(message.id, message.decision.decisionId, true)}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Yes
                        </button>
                        <button
                          className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                          onClick={() => handleDecision(message.id, message.decision.decisionId, false)}
                        >
                          <XCircle className="w-3.5 h-3.5" /> No
                        </button>
                      </div>
                    )}

                    {message.decision.decisionResolving && (
                      <div className="mt-2 text-xs italic">Processing...</div>
                    )}

                    {message.decision.decisionResult && (
                      <div className={`mt-2 text-xs font-medium flex items-center gap-1 ${message.decision.decisionResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {message.decision.decisionResult.success ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                        {message.decision.decisionResult.message}
                      </div>
                    )}

                    {message.decision.votes && message.decision.votes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.decision.votes.map((vote, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="font-semibold capitalize">{vote.agent}:</span>
                            <span className={`flex items-center gap-1 ${vote.approve ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}`}>
                              {vote.approve ? <><CheckCircle className="w-3 h-3 shrink-0" /> Approved</> : <><XCircle className="w-3 h-3 shrink-0" /> Rejected</>}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {message.analysis && (
                  <div className="mt-2 w-full space-y-2">
                    {message.analysis.warden && (
                      <details className="group bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden text-sm">
                        <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-700/30 transition-colors list-none">
                          <span className="bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded text-xs font-bold">Warden</span>
                          <span className="text-slate-400 font-medium">Monitoring & detection</span>
                        </summary>
                        <div className="p-3 border-t border-slate-700/50">
                          <MarkdownBlock content={message.analysis.warden} />
                        </div>
                      </details>
                    )}
                    {message.analysis.finance && (
                      <details className="group bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden text-sm">
                        <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-700/30 transition-colors list-none">
                          <span className="bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded text-xs font-bold">Finance</span>
                          <span className="text-slate-400 font-medium">Budget & approval</span>
                        </summary>
                        <div className="p-3 border-t border-slate-700/50">
                          <MarkdownBlock content={message.analysis.finance} />
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {(message.productCards || message.decision?.productCards)?.length ? (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {(message.productCards || message.decision?.productCards)?.map((p) => (
                      <ProductCard key={p.id} product={p} compact />
                    ))}
                  </div>
                ) : null}

                <p className="text-xs text-slate-500 mt-1">
                  {message.timestamp instanceof Date
                    ? message.timestamp.toLocaleTimeString()
                    : new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-800/50 bg-[#0d1324]/80">
          <div className="flex flex-col gap-2 max-w-4xl mx-auto relative">
            {selectedAgentIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedAgentIds.map((id) => {
                  const agent = AVAILABLE_AGENTS.find((a) => a.id === id);
                  const isHighlighted = highlightedAgentId === id;
                  return (
                    <span
                      key={id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium transition-all duration-300 ${
                        isHighlighted
                          ? 'bg-[#3b82f6] text-white ring-2 ring-[#60a5fa] ring-offset-2 ring-offset-[#0d1324] shadow-lg shadow-[#3b82f6]/40'
                          : 'bg-[#3b82f6]/20 text-[#3b82f6]'
                      }`}
                    >
                      {agent?.name ?? id}
                      <button
                        type="button"
                        onClick={() => toggleAgent(id)}
                        className="hover:bg-[#3b82f6]/30 rounded p-0.5 transition-colors"
                        aria-label={`Remove ${agent?.name}`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2 relative">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about inventory, trends, customers... Type @ to select agents"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                />
                {atMentionOpen && (
                  <div
                    ref={atMentionRef}
                    className="absolute bottom-full left-0 right-0 mb-1 bg-[#0d1324] border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto"
                  >
                    <div className="p-2 border-b border-slate-700/50 text-xs text-slate-400 flex items-center gap-1">
                      <AtSign className="w-3.5 h-3.5" /> Select agents to direct your message
                    </div>
                    <ul className="p-1">
                      {filteredAgents.map((agent, idx) => (
                        <li key={agent.id} ref={(el) => { atMentionItemRefs.current[idx] = el; }}>
                          <button
                            type="button"
                            onClick={() => selectAgent(agent)}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                              idx === atMentionFocusedIndex
                                ? 'bg-[#3b82f6]/40 text-white ring-1 ring-[#3b82f6]'
                                : selectedAgentIds.includes(agent.id)
                                  ? 'bg-[#3b82f6]/30 text-[#3b82f6]'
                                  : 'hover:bg-slate-700/50 text-slate-200'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              selectedAgentIds.includes(agent.id) ? 'bg-[#3b82f6] border-[#3b82f6]' : 'border-slate-500'
                            }`}>
                              {selectedAgentIds.includes(agent.id) && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                            </span>
                            <div>
                              <span className="font-medium">{agent.name}</span>
                              <span className="text-slate-500 text-xs block">{agent.desc}</span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions (hidden on mobile for now) */}
      <div className="w-64 bg-[#0d1324] border-l border-slate-800/50 hidden lg:block p-4 overflow-y-auto">
        <h2 className="font-bold text-slate-300 mb-4">Quick Actions</h2>
        <div className="space-y-3">
          {[
            { label: 'Check Inventory', icon: Package, sub: 'Low stock alerts', query: 'Check inventory levels' },
            { label: 'Abandoned Carts', icon: ShoppingCart, sub: 'Recovery opportunities', query: 'Show me abandoned carts' },
            { label: 'Sales Analysis', icon: TrendingUp, sub: 'Revenue & trends', query: "Analyze today's sales" },
            { label: 'Restock Alert', icon: RefreshCw, sub: 'Reorder needs', query: 'What products need restocking?' },
            { label: 'Add Product', icon: Plus, sub: 'Create new listing', query: 'Add a new product: Blue Cotton Hoodie, $45' },
            { label: 'Restock', icon: PackagePlus, sub: 'Add inventory', query: 'Restock Canvas Sneakers by 20 units' },
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={() => setInput(action.query)}
                className="w-full text-left p-3 rounded-lg border border-slate-700/50 hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/10 transition-all group"
              >
                <div className="font-medium text-slate-300 group-hover:text-white flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-500 group-hover:text-[#3b82f6] shrink-0" />
                  {action.label}
                </div>
                <div className="text-xs text-slate-500 group-hover:text-[#3b82f6]">{action.sub}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <h3 className="font-bold text-amber-400 text-sm mb-1 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 shrink-0" /> Tip
          </h3>
          <p className="text-xs text-amber-200 opacity-90">
            Type @ in the input to select specific agents (Warden, Finance, Consensus, Proposal). Use Yes/No to approve actions.
          </p>
        </div>
      </div>
    </div>
  );
}
