import {
  Bot,
  MessageCircle,
  MessageSquare,
  Send,
  X,
  Search,
  BookOpen,
  History,
  Plus,
  Sparkles,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Clock,
  ShieldAlert,
  SlidersHorizontal,
  BookmarkCheck,
  Info,
  RefreshCw,
  Database,
  AlertTriangle,
  FileCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import logo from "../assets/logo.png";
import { RAG_API_URL } from "../config/api";
import "./FloatingChatBubble.css";

const STORAGE_CHATS_KEY = "geneair_ai_consultations";
const STORAGE_EVIDENCE_KEY = "geneair_rag_evidence_cache";

function createDefaultChat() {
  return {
    id: `conv-${Date.now()}`,
    title: "New Clinical Consultation",
    preview: "Ready to assist with RAG-backed respiratory evidence...",
    timestamp: "Just now",
    messages: [
      {
        id: `msg-${Date.now()}`,
        sender: "ai",
        text: "Hello Doctor. GeneAir AI is active and connected to the RAG Knowledgebase. Ask any clinical question, search genetic associations, or review GINA guidance to retrieve real-time evidence.",
        citations: [],
        safety: null,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ],
  };
}

function FloatingChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); 
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHATS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      
    }
    return [createDefaultChat()];
  });
  const [currentConvId, setCurrentConvId] = useState(() => conversations[0]?.id || "conv-1");
  const [question, setQuestion] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const [ragEvidenceList, setRagEvidenceList] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EVIDENCE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      
    }
    return [];
  });
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [isSearchingRag, setIsSearchingRag] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [recentSearch, setRecentSearch] = useState("");
  const [ragServiceStatus, setRagServiceStatus] = useState("checking"); 

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHATS_KEY, JSON.stringify(conversations));
    } catch {
      
    }
  }, [conversations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EVIDENCE_KEY, JSON.stringify(ragEvidenceList));
    } catch {
      
    }
  }, [ragEvidenceList]);

  useEffect(() => {
    if (isOpen) {
      setRagServiceStatus("checking");
      fetch(`${RAG_API_URL}/health`, { method: "GET" })
        .then((res) => {
          if (res.ok) setRagServiceStatus("online");
          else setRagServiceStatus("offline");
        })
        .catch(() => setRagServiceStatus("offline"));
    }
  }, [isOpen]);

  const activeConversation = useMemo(() => {
    return (
      conversations.find((c) => c.id === currentConvId) ||
      conversations[0] ||
      createDefaultChat()
    );
  }, [conversations, currentConvId]);

  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, activeTab, activeConversation?.messages, isTyping]);

  const handleCopyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartNewChat = () => {
    const newChat = createDefaultChat();
    setConversations((prev) => [newChat, ...prev]);
    setCurrentConvId(newChat.id);
    setActiveTab("chat");
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleDeleteConversation = (id, e) => {
    e.stopPropagation();
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const fresh = createDefaultChat();
        setCurrentConvId(fresh.id);
        return [fresh];
      }
      if (currentConvId === id) {
        setCurrentConvId(filtered[0].id);
      }
      return filtered;
    });
  };

  const queryRagService = async (queryText) => {
    const payload = {
      question: queryText,
      context: {
        genetics: [],
        clinical: {},
        medication: {},
        age_group: "adult",
        severity: "moderate_persistent",
      },
      top_k: 5,
    };

    const response = await fetch(`${RAG_API_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`RAG service error (HTTP ${response.status}): ${errText}`);
    }

    setRagServiceStatus("online");
    return await response.json();
  };

  const ingestRagCitations = (citations, query) => {
    if (!citations || !Array.isArray(citations) || citations.length === 0) return;

    setRagEvidenceList((prev) => {
      const existingIds = new Set(prev.map((e) => e.chunk_id));
      const newlyRetrieved = [];

      for (const cit of citations) {
        if (!existingIds.has(cit.chunk_id)) {
          newlyRetrieved.push({
            id:
              cit.chunk_id ||
              `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            chunk_id: cit.chunk_id,
            source: cit.source || "RAG Knowledge Corpus",
            evidence_type: cit.evidence_type || "guideline",
            score: typeof cit.score === "number" ? Math.round(cit.score * 100) : 85,
            queryOrigin: query,
            retrievedAt: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
          existingIds.add(cit.chunk_id);
        }
      }

      return [...newlyRetrieved, ...prev];
    });
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!question.trim() || isTyping) return;

    const userPrompt = question.trim();
    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: userPrompt,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...(activeConversation?.messages || []), userMsg];
    setQuestion("");

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConvId
          ? {
              ...c,
              title:
                c.title === "New Clinical Consultation"
                  ? userPrompt.slice(0, 36) + "..."
                  : c.title,
              preview: userPrompt.slice(0, 48) + "...",
              timestamp: "Just now",
              messages: updatedMessages,
            }
          : c
      )
    );

    setIsTyping(true);

    try {
      const ragResponse = await queryRagService(userPrompt);
      ingestRagCitations(ragResponse.citations, userPrompt);

      const aiMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: "ai",
        text: ragResponse.answer || "No response received from RAG knowledgebase.",
        citations: ragResponse.citations || [],
        safety: ragResponse.safety || null,
        evidence_state: ragResponse.evidence_state,
        corpus_version: ragResponse.corpus_version,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvId ? { ...c, messages: [...c.messages, aiMsg] } : c
        )
      );
    } catch (err) {
      console.error("RAG Service Unreachable:", err);
      setRagServiceStatus("offline");

      const errorMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: "ai",
        isError: true,
        text: `Unable to connect to GeneAir RAG Service at ${RAG_API_URL}.\n\nPlease start the Python RAG backend in your terminal:\ncd rag-service\nuvicorn app:app --port 8000`,
        citations: [],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvId ? { ...c, messages: [...c.messages, errorMsg] } : c
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleSearchRagEvidence = async (e) => {
    e?.preventDefault();
    if (!evidenceSearch.trim() || isSearchingRag) return;

    setIsSearchingRag(true);
    try {
      const result = await queryRagService(evidenceSearch.trim());
      if (result.citations && result.citations.length > 0) {
        ingestRagCitations(result.citations, evidenceSearch.trim());
      }
    } catch (err) {
      console.error("RAG Evidence Search Error:", err);
      setRagServiceStatus("offline");
    } finally {
      setIsSearchingRag(false);
    }
  };

  const handleClearEvidenceCache = () => {
    setRagEvidenceList([]);
    try {
      localStorage.removeItem(STORAGE_EVIDENCE_KEY);
    } catch {
      
    }
  };

  const categories = [
    "All",
    "guideline",
    "curated_pg",
    "systematic_review",
    "primary_study",
  ];
  const filteredEvidence = useMemo(() => {
    return ragEvidenceList.filter((item) => {
      const matchesCat =
        selectedCategory === "All" || item.evidence_type === selectedCategory;
      const q = evidenceSearch.toLowerCase();
      const matchesSearch =
        !q ||
        (item.source && item.source.toLowerCase().includes(q)) ||
        (item.chunk_id && item.chunk_id.toLowerCase().includes(q)) ||
        (item.queryOrigin && item.queryOrigin.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [ragEvidenceList, selectedCategory, evidenceSearch]);

  const filteredRecents = useMemo(() => {
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(recentSearch.toLowerCase()) ||
        c.preview.toLowerCase().includes(recentSearch.toLowerCase())
    );
  }, [conversations, recentSearch]);

  return (
    <>
      
      {isOpen && (
        <button
          type="button"
          className="ask-ai-backdrop"
          onClick={() => setIsOpen(false)}
          aria-label="Close Ask AI panel"
        />
      )}

      <aside
        className={`ask-ai-panel${isOpen ? " is-open" : ""}${isSidebarCollapsed ? " is-collapsed" : ""}`}
        aria-hidden={!isOpen}
      >
        <div className="ask-ai-layout">
          
          <nav className={`ask-ai-sidebar ${isSidebarCollapsed ? "is-collapsed" : ""}`}>
            
            <div className="ask-ai-sidebar-header">
              <div className="ask-ai-sidebar-brand">
                <div className="ask-ai-brand-avatar-wrap">
                  <img src={logo} alt="GeneAir" className="ask-ai-brand-logo" />
                  <span
                    className={`ask-ai-status-indicator-dot ${ragServiceStatus === "online" ? "is-online" : "is-offline"}`}
                    title={
                      ragServiceStatus === "online"
                        ? "GeneAir AI Online (:8000)"
                        : "GeneAir AI Offline"
                    }
                  />
                </div>
                {!isSidebarCollapsed && (
                  <div className="ask-ai-brand-info">
                    <strong className="ask-ai-brand-name">GeneAir AI</strong>
                    <span className="ask-ai-brand-badge">Clinical RAG</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="ask-ai-sidebar-toggle-btn"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                aria-label="Toggle Sidebar"
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen size={17} />
                ) : (
                  <PanelLeftClose size={17} />
                )}
              </button>
            </div>

            <div className="ask-ai-sidebar-action">
              <button
                type="button"
                className="ask-ai-sidebar-new-btn"
                onClick={handleStartNewChat}
                title="Start New Clinical Consultation"
              >
                <Plus size={17} strokeWidth={2.4} />
                {!isSidebarCollapsed && <span>New Chat</span>}
              </button>
            </div>

            <div className="ask-ai-sidebar-nav" aria-label="Sidebar Navigation">
              
              <button
                type="button"
                className={`ask-ai-nav-btn ${activeTab === "chat" ? "is-active" : ""}`}
                onClick={() => setActiveTab("chat")}
                title="Chat"
              >
                <span className="ask-ai-nav-icon-box">
                  <MessageSquare size={18} strokeWidth={2.2} />
                </span>
                {!isSidebarCollapsed && <span className="ask-ai-nav-text">Chat</span>}
              </button>

              <button
                type="button"
                className={`ask-ai-nav-btn ${activeTab === "recents" ? "is-active" : ""}`}
                onClick={() => setActiveTab("recents")}
                title="Recent Chats"
              >
                <span className="ask-ai-nav-icon-box">
                  <History size={18} strokeWidth={2.2} />
                  {isSidebarCollapsed && conversations.length > 0 && (
                    <span className="ask-ai-nav-badge-dot">{conversations.length}</span>
                  )}
                </span>
                {!isSidebarCollapsed && (
                  <>
                    <span className="ask-ai-nav-text">Recent Chats</span>
                    <span className="ask-ai-nav-pill">{conversations.length}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className={`ask-ai-nav-btn ${activeTab === "evidence" ? "is-active" : ""}`}
                onClick={() => setActiveTab("evidence")}
                title="Evidence Library"
              >
                <span className="ask-ai-nav-icon-box">
                  <BookOpen size={18} strokeWidth={2.2} />
                  {isSidebarCollapsed && ragEvidenceList.length > 0 && (
                    <span className="ask-ai-nav-badge-dot">{ragEvidenceList.length}</span>
                  )}
                </span>
                {!isSidebarCollapsed && (
                  <>
                    <span className="ask-ai-nav-text">Evidence Library</span>
                    <span className="ask-ai-nav-pill">{ragEvidenceList.length}</span>
                  </>
                )}
              </button>
            </div>

            <div className="ask-ai-sidebar-footer">
              <div
                className="ask-ai-sidebar-status-box"
                title={
                  ragServiceStatus === "online"
                    ? "GeneAir AI Online (:8000)"
                    : "GeneAir AI Offline"
                }
              >
                <span
                  className={`ask-ai-sidebar-status-ring ${ragServiceStatus === "online" ? "is-online" : "is-offline"}`}
                />
                {!isSidebarCollapsed && (
                  <span className="ask-ai-sidebar-status-text">
                    {ragServiceStatus === "online" ? "GeneAir AI Online" : "GeneAir AI Offline"}
                  </span>
                )}
              </div>
            </div>
          </nav>

          <div className="ask-ai-main">
            
            <div className="ask-ai-main-header">
              <div className="ask-ai-header-title-wrap">
                <strong className="ask-ai-header-main-title">
                  {activeTab === "chat" && (activeConversation?.title || "Clinical Chat")}
                  {activeTab === "recents" && "Recent Consultations"}
                  {activeTab === "evidence" && "RAG Evidence Library"}
                </strong>
                {activeTab === "chat" && (
                  <span className="ask-ai-header-sub-tag">
                    {activeConversation?.messages.length} messages
                  </span>
                )}
              </div>

              <div className="ask-ai-header-controls">
                {activeTab === "chat" && (
                  <span
                    className={`ask-ai-status-pill ${ragServiceStatus === "online" ? "is-online" : "is-offline"}`}
                    title={
                      ragServiceStatus === "online"
                        ? "GeneAir AI Server Connected (:8000)"
                        : "GeneAir AI server not connected at port 8000"
                    }
                  >
                    {ragServiceStatus === "online" ? "GeneAir AI Online" : "GeneAir AI Offline"}
                  </span>
                )}
                <button
                  type="button"
                  className="ask-ai-close-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close GeneAir AI"
                  title="Close Window"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="ask-ai-body">
              
              {activeTab === "chat" && (
                <div className="ask-ai-chat-view">
                  
                  <div className="ask-ai-messages-scroll">
                    {activeConversation?.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`ask-ai-message-row ${msg.sender === "user" ? "is-user" : "is-ai"}`}
                      >
                        {msg.sender === "ai" && (
                          <div className="ask-ai-msg-avatar">
                            <Sparkles size={15} />
                          </div>
                        )}
                        <div className="ask-ai-bubble-container">
                          <div className={`ask-ai-message-bubble ${msg.isError ? "is-error" : ""}`}>
                            
                            {msg.safety && msg.safety.state !== "safe" && (
                              <div className={`ask-ai-safety-alert is-${msg.safety.state}`}>
                                <ShieldAlert size={14} />
                                <span>{msg.safety.message}</span>
                              </div>
                            )}

                            <p className="ask-ai-message-text">{msg.text}</p>

                            {msg.citations && msg.citations.length > 0 && (
                              <div className="ask-ai-citations-box">
                                <span className="ask-ai-citations-title">
                                  <BookmarkCheck size={13} /> Retrieved RAG Evidence ({msg.citations.length}):
                                </span>
                                <div className="ask-ai-citations-list">
                                  {msg.citations.map((cit, idx) => (
                                    <button
                                      key={cit.chunk_id || idx}
                                      type="button"
                                      className="ask-ai-citation-chip"
                                      onClick={() => setActiveTab("evidence")}
                                      title={`Source: ${cit.source} (Match: ${Math.round((cit.score || 0) * 100)}%)`}
                                    >
                                      <FileCheck size={11} />
                                      <span>{cit.source?.replace(/\.[^/.]+$/, "")}</span>
                                      {typeof cit.score === "number" && (
                                        <span className="ask-ai-citation-score">
                                          {Math.round(cit.score * 100)}%
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="ask-ai-msg-footer">
                            <span className="ask-ai-msg-time">{msg.time}</span>
                            {msg.sender === "ai" && !msg.isError && (
                              <div className="ask-ai-msg-actions">
                                <button
                                  type="button"
                                  className="ask-ai-copy-btn"
                                  onClick={() => handleCopyMessage(msg.id, msg.text)}
                                  title="Copy response"
                                >
                                  {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                                <button
                                  type="button"
                                  className="ask-ai-feedback-btn"
                                  title="Helpful"
                                >
                                  <ThumbsUp size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="ask-ai-feedback-btn"
                                  title="Not helpful"
                                >
                                  <ThumbsDown size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="ask-ai-message-row is-ai">
                        <div className="ask-ai-msg-avatar">
                          <Sparkles size={15} />
                        </div>
                        <div className="ask-ai-bubble-container">
                          <div className="ask-ai-message-bubble ask-ai-typing-bubble">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="ask-ai-typing-label">
                              Querying RAG knowledgebase...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {activeConversation?.messages.length <= 1 && !isTyping && (
                    <div className="ask-ai-suggestions-bar">
                      <span className="ask-ai-suggestions-label">Clinical Queries:</span>
                      <div className="ask-ai-suggestions-chips">
                        <button
                          type="button"
                          onClick={() =>
                            setQuestion(
                              "What are the GINA 2026 Step 3 controller recommendations?"
                            )
                          }
                        >
                          GINA Step 3 Therapy
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setQuestion(
                              "Explain the ADRB2 gene rs1042713 association with bronchodilator response."
                            )
                          }
                        >
                          ADRB2 rs1042713 Variant
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setQuestion(
                              "What is the acute emergency guidance for severe asthma?"
                            )
                          }
                        >
                          Emergency Action Plan
                        </button>
                      </div>
                    </div>
                  )}

                  <form className="ask-ai-input-form" onSubmit={handleSendMessage}>
                    <div className="ask-ai-input-wrapper">
                      <input
                        ref={inputRef}
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask clinical question to retrieve RAG evidence..."
                        aria-label="Clinical AI Question"
                      />
                      <button
                        type="submit"
                        className="ask-ai-send-btn"
                        disabled={!question.trim() || isTyping}
                        title="Send Query to RAG"
                        aria-label="Send"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === "recents" && (
                <div className="ask-ai-recents-view">
                  
                  <div className="ask-ai-recents-header">
                    <div className="ask-ai-search-box">
                      <Search size={15} />
                      <input
                        type="text"
                        placeholder="Search past consultations..."
                        value={recentSearch}
                        onChange={(e) => setRecentSearch(e.target.value)}
                      />
                      {recentSearch && (
                        <button
                          type="button"
                          onClick={() => setRecentSearch("")}
                          className="ask-ai-clear-search"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="ask-ai-new-chat-btn"
                      onClick={handleStartNewChat}
                    >
                      <Plus size={15} />
                      <span>New Chat</span>
                    </button>
                  </div>

                  <div className="ask-ai-recents-list">
                    {filteredRecents.length === 0 ? (
                      <div className="ask-ai-empty-state">
                        <History size={36} className="ask-ai-empty-icon" />
                        <strong>No consultations found</strong>
                        <p>Start a new consultation to query the RAG knowledgebase.</p>
                      </div>
                    ) : (
                      filteredRecents.map((conv) => {
                        const isCurrent = conv.id === currentConvId;
                        return (
                          <div
                            key={conv.id}
                            className={`ask-ai-recent-card ${isCurrent ? "is-selected" : ""}`}
                            onClick={() => {
                              setCurrentConvId(conv.id);
                              setActiveTab("chat");
                            }}
                          >
                            <div className="ask-ai-recent-card-left">
                              <div
                                className={`ask-ai-recent-icon-wrap ${isCurrent ? "is-active" : ""}`}
                              >
                                <MessageSquare size={16} />
                              </div>
                              <div className="ask-ai-recent-card-text">
                                <div className="ask-ai-recent-title-line">
                                  <strong className="ask-ai-recent-title">
                                    {conv.title}
                                  </strong>
                                  {isCurrent && (
                                    <span className="ask-ai-active-badge">Active</span>
                                  )}
                                </div>
                                <p className="ask-ai-recent-preview">{conv.preview}</p>
                                <span className="ask-ai-recent-time">
                                  <Clock size={11} /> {conv.timestamp} •{" "}
                                  {conv.messages.length} messages
                                </span>
                              </div>
                            </div>

                            <div className="ask-ai-recent-card-actions">
                              <button
                                type="button"
                                className="ask-ai-delete-chat-btn"
                                onClick={(e) => handleDeleteConversation(conv.id, e)}
                                title="Delete Consultation"
                              >
                                <Trash2 size={14} />
                              </button>
                              <ChevronRight size={16} className="ask-ai-recent-arrow" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === "evidence" && (
                <div className="ask-ai-evidence-view">
                  
                  <div className="ask-ai-evidence-toolbar">
                    <form
                      className="ask-ai-search-box"
                      onSubmit={handleSearchRagEvidence}
                    >
                      <Search size={15} />
                      <input
                        type="text"
                        placeholder="Search RAG knowledgebase (e.g. GINA, ADRB2, ORMDL3)..."
                        value={evidenceSearch}
                        onChange={(e) => setEvidenceSearch(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="ask-ai-query-rag-btn"
                        disabled={!evidenceSearch.trim() || isSearchingRag}
                        title="Retrieve from ChromaDB RAG index"
                      >
                        {isSearchingRag ? (
                          <RefreshCw size={12} className="ask-ai-spin" />
                        ) : (
                          "Query RAG"
                        )}
                      </button>
                    </form>

                    <div className="ask-ai-category-chips">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`ask-ai-cat-pill ${selectedCategory === cat ? "is-active" : ""}`}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat === "All" ? "All Sources" : cat.replace("_", " ")}
                        </button>
                      ))}
                      {ragEvidenceList.length > 0 && (
                        <button
                          type="button"
                          className="ask-ai-clear-evidence-btn"
                          onClick={handleClearEvidenceCache}
                          title="Clear retrieved evidence list"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="ask-ai-evidence-list">
                    {filteredEvidence.length === 0 ? (
                      <div className="ask-ai-empty-state">
                        <Database size={36} className="ask-ai-empty-icon" />
                        <strong>No RAG Evidence Retrieved Yet</strong>
                        <p>
                          Evidence chunks are populated dynamically from the RAG
                          knowledgebase when you ask clinical questions or query
                          ChromaDB above.
                        </p>
                        <div className="ask-ai-rag-status-card">
                          <span className="ask-ai-rag-status-title">
                            RAG Backend Status:
                          </span>
                          <span
                            className={`ask-ai-rag-status-badge ${ragServiceStatus === "online" ? "is-online" : "is-offline"}`}
                          >
                            {ragServiceStatus === "online"
                              ? "GeneAir AI Online (:8000)"
                              : "GeneAir AI Offline"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      filteredEvidence.map((ev) => (
                        <div key={ev.id} className="ask-ai-evidence-card">
                          <div className="ask-ai-evidence-card-header">
                            <div className="ask-ai-evidence-badges">
                              <span className="ask-ai-badge-category">
                                {ev.evidence_type}
                              </span>
                              {ev.score && (
                                <span className="ask-ai-badge-score">
                                  Match: {ev.score}%
                                </span>
                              )}
                            </div>
                            <span className="ask-ai-evidence-doi">
                              {ev.chunk_id || ev.id}
                            </span>
                          </div>

                          <h4 className="ask-ai-evidence-title">{ev.source}</h4>
                          {ev.queryOrigin && (
                            <p className="ask-ai-evidence-query-origin">
                              <strong>Retrieved for:</strong> "{ev.queryOrigin}"
                            </p>
                          )}

                          <div className="ask-ai-evidence-footer-actions">
                            <span className="ask-ai-evidence-timestamp">
                              <Clock size={11} /> {ev.retrievedAt}
                            </span>
                            <button
                              type="button"
                              className="ask-ai-use-in-chat-btn"
                              onClick={() => {
                                setActiveTab("chat");
                                setQuestion(
                                  `What details does ${ev.source} provide regarding asthma management?`
                                );
                                setTimeout(() => inputRef.current?.focus(), 120);
                              }}
                            >
                              <Sparkles size={13} />
                              <span>Ask in Chat</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className={`floating-chat-bubble${isOpen ? " is-hidden" : ""}`}
        onClick={() => setIsOpen(true)}
        aria-label="Open GeneAir AI"
        title="GeneAir AI - Clinical Knowledgebase"
      >
        <span className="floating-chat-pulse" aria-hidden="true" />
        <div className="floating-chat-content">
          <MessageCircle
            className="floating-chat-icon"
            size={26}
            strokeWidth={2.3}
            aria-hidden="true"
          />
        </div>
      </button>
    </>
  );
}

export default FloatingChatBubble;
