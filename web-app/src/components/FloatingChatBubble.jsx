import { Bot, MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";
import logo from "../assets/logo.png";
import "./FloatingChatBubble.css";

function FloatingChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");

  const askAssistant = (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    setQuestion("");
  };

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

      <aside className={`ask-ai-panel${isOpen ? " is-open" : ""}`} aria-hidden={!isOpen}>
        <div className="ask-ai-panel-header">
          <div className="ask-ai-brand">
            <img src={logo} alt="GeneAir" />
            <div>
              <strong>Ask AI</strong>
              <span>GeneAir health assistant</span>
            </div>
          </div>
          <button type="button" className="ask-ai-close" onClick={() => setIsOpen(false)} aria-label="Close Ask AI">
            <X size={19} />
          </button>
        </div>
        <div className="ask-ai-content">
          <div className="ask-ai-welcome">
            <div className="ask-ai-avatar"><Bot size={22} /></div>
            <div>
              <strong>How can I help?</strong>
              <p>Ask about asthma care, patient records, or risk insights.</p>
            </div>
          </div>
          <div className="ask-ai-suggestions">
            <button type="button" onClick={() => setQuestion("What are common asthma triggers?")}>Common asthma triggers</button>
            <button type="button" onClick={() => setQuestion("Summarize this patient history")}>Summarize patient history</button>
          </div>
        </div>
        <form className="ask-ai-input" onSubmit={askAssistant}>
          <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask GeneAir AI..." aria-label="Ask GeneAir AI" />
          <button type="submit" aria-label="Send question"><Send size={18} /></button>
        </form>
      </aside>

      <button type="button" className={`floating-chat-bubble${isOpen ? " is-hidden" : ""}`} onClick={() => setIsOpen(true)} aria-label="Open Ask AI" title="Ask AI">
        <span className="floating-chat-pulse" aria-hidden="true" />
        <MessageCircle className="floating-chat-icon" size={29} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </>
  );
}

export default FloatingChatBubble;
