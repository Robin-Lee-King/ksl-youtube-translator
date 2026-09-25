import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, useEasyMode } from "../state/AppContext";
import { thumbOf } from "../utils/video";
import EmptyState from "../components/common/EmptyState";
import recentEmptyIcon from "../assets/recent-empty-icon.png";
import groupPlaceholder from "../assets/group-placeholder.png";
import { ICON } from "../constants";

const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
const SAMPLE_URL = "https://www.youtube.com/watch?v=M7lc1UVf-VE";

export default function HomePage() {
  const easy = useEasyMode();
  return easy ? <EasyHome /> : <StandardHome />;
}

function useConvert() {
  const navigate = useNavigate();
  const { setCurrentUrl } = useApp();
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  function convert(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setUrlError("유튜브 링크를 입력해주세요.");
      return;
    }
    if (!YT_REGEX.test(trimmed)) {
      setUrlError("올바른 유튜브 링크를 입력해주세요.");
      return;
    }
    setUrlError("");
    setCurrentUrl(trimmed);
    navigate("/processing");
  }

  return { url, setUrl, urlError, setUrlError, convert };
}

function EasyHome() {
  const navigate = useNavigate();
  const { url, setUrl, urlError, convert } = useConvert();

  const CARDS = [
    {
      key: "recent",
      title: "최근 시청 영상",
      desc: "최근에 본 수어 영상을\n이어서 볼 수 있어요.",
      bg: "#EBF4FF",
      iconColor: "#5B8DB8",
      arrowBg: "#A8C8E8",
      arrowColor: "#fff",
      icon: (
        <svg viewBox="0 0 24 24" style={{ width: "44px", height: "44px" }} fill="none" stroke="#5B8DB8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
      ),
      action: () => navigate("/history"),
    },
    {
      key: "saved",
      title: "저장한 영상",
      desc: "나중에 다시 보고 싶은\n영상을 모아둘 수 있어요.",
      bg: "#FEF6E4",
      iconColor: "#C49A3A",
      arrowBg: "#E5C87A",
      arrowColor: "#fff",
      icon: (
        <svg viewBox="0 0 24 24" style={{ width: "44px", height: "44px" }} fill="none" stroke="#C49A3A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
      action: () => navigate("/history", { state: { tab: "groups" } }),
    },
    {
      key: "settings",
      title: "설정하기",
      desc: "자막, 속도, 화면 크기 등\n나에게 맞게 설정해요.",
      bg: "#F0F2F5",
      iconColor: "#8A9099",
      arrowBg: "#C5CBD5",
      arrowColor: "#fff",
      icon: (
        <svg viewBox="0 0 24 24" style={{ width: "44px", height: "44px" }} fill="none" stroke="#8A9099" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      action: () => navigate("/mypage"),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* URL input hero */}
      <div style={{ padding: "32px 24px 28px", background: "linear-gradient(160deg, #F0FAF5 0%, #DDF5E8 60%, #f7fcf8 100%)" }}>
        <div style={{ maxWidth: "576px", margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, margin: "0 0 6px" }}>유튜브 링크를 붙여넣으세요</h1>
          <p style={{ fontSize: "14px", color: "#747C78", margin: "0 0 18px" }}>AI가 자동으로 수어 통역 영상을 만들어드립니다</p>
          <div style={{ background: "#fff", border: "1px solid #E5E8E7", borderRadius: "16px", padding: "10px", display: "flex", gap: "8px", boxShadow: "0 4px 12px rgba(0,0,0,.06)" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "8px", padding: "0 12px" }}>
              <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", flexShrink: 0, fill: "#747C78" }}>
                <path d={ICON.link} />
              </svg>
              <input
                id="easy-url-input"
                className="gn-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter") convert(url); }}
                placeholder="https://youtube.com/watch?v=..."
                style={{ flex: 1, minWidth: 0, border: "none", fontSize: "15px", padding: "10px 0", background: "transparent" }}
              />
            </div>
            <button
              onClick={() => convert(url)}
              className="hover-primary"
              style={{ background: "#10B45F", color: "#fff", padding: "12px 22px", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              수어로 보기
            </button>
          </div>
          {urlError && <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#EF4444", textAlign: "left", padding: "0 4px" }}>{urlError}</p>}
          <button
            onClick={() => setUrl(SAMPLE_URL)}
            className="hover-green"
            style={{ marginTop: "12px", background: "none", border: "none", fontSize: "13px", color: "#747C78", textDecoration: "underline", textUnderlineOffset: "2px", cursor: "pointer" }}
          >
            샘플 링크 사용하기
          </button>
        </div>
      </div>

      {/* Menu cards */}
      <div style={{ flex: 1, maxWidth: "720px", margin: "0 auto", width: "100%", padding: "20px 20px 24px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "12px" }}>
        {CARDS.map((card) => (
          <button
            key={card.key}
            onClick={card.action}
            style={{
              flex: 1,
              background: card.bg,
              border: "none",
              borderRadius: "24px",
              padding: "24px 24px 20px",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            <div style={{ marginBottom: "12px" }}>{card.icon}</div>
            <p style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.01em", color: "#171C19", lineHeight: 1.2 }}>
              {card.title}
            </p>
            <p style={{ fontSize: "15px", color: "#5c655f", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
              {card.desc}
            </p>
            <div
              style={{
                position: "absolute",
                bottom: "20px",
                right: "20px",
                width: "44px",
                height: "44px",
                borderRadius: "999px",
                background: card.arrowBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "22px", height: "22px", fill: card.arrowColor }}>
                <path d={ICON.chevronRight} />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StandardHome() {
  const { history, groups, setCurrentUrl } = useApp();
  const navigate = useNavigate();
  const { url, setUrl, urlError, convert } = useConvert();

  const done = history.filter((h) => h.status === "완료");
  const recent = done.slice(0, 4);

  function play(itemUrl: string) {
    setCurrentUrl(itemUrl);
    navigate("/player");
  }

  return (
    <div>
      <div style={{ padding: "64px 24px 80px", background: "linear-gradient(160deg, #F0FAF5 0%, #DDF5E8 60%, #f7fcf8 100%)" }}>
        <div style={{ maxWidth: "576px", margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "30px", fontWeight: 700, margin: "0 0 8px" }}>유튜브 링크를 붙여넣으세요</h1>
          <p style={{ fontSize: "14px", color: "#747C78", margin: "0 0 24px" }}>AI가 자동으로 수어 통역 영상을 만들어드립니다</p>
          <div style={{ background: "#fff", border: "1px solid #E5E8E7", borderRadius: "16px", padding: "10px", display: "flex", gap: "8px", boxShadow: "0 4px 12px rgba(0,0,0,.06)" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "8px", padding: "0 12px" }}>
              <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", flexShrink: 0, fill: "#747C78" }}>
                <path d={ICON.link} />
              </svg>
              <input
                className="gn-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === "Enter") convert(url);
                }}
                placeholder="https://youtube.com/watch?v=..."
                style={{ flex: 1, minWidth: 0, border: "none", fontSize: "14px", padding: "10px 0", background: "transparent" }}
              />
            </div>
            <button
              onClick={() => convert(url)}
              className="hover-primary"
              style={{ background: "#10B45F", color: "#fff", padding: "12px 20px", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              수어로 보기
            </button>
          </div>
          {urlError && <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#EF4444", textAlign: "left", padding: "0 4px" }}>{urlError}</p>}
          <button
            onClick={() => setUrl(SAMPLE_URL)}
            className="hover-green"
            style={{ marginTop: "12px", background: "none", border: "none", fontSize: "12px", color: "#747C78", textDecoration: "underline", textUnderlineOffset: "2px", cursor: "pointer" }}
          >
            샘플 링크 사용하기
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "896px", margin: "0 auto", padding: "32px 16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>최근 변환 기록</h2>
            <button onClick={() => navigate("/history")} style={{ background: "none", border: "none", fontSize: "14px", fontWeight: 500, color: "#10B45F", cursor: "pointer" }}>
              전체 보기
            </button>
          </div>
          {recent.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "12px" }}>
              {recent.map((r) => (
                <button
                  key={r.id}
                  onClick={() => play(r.url)}
                  className="hover-card"
                  style={{ background: "#fff", border: "1px solid #E5E8E7", borderRadius: "16px", overflow: "hidden", padding: 0, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column" }}
                >
                  <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#F0FAF5" }}>
                    <img src={thumbOf(r.url)} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <span style={{ position: "absolute", top: "8px", left: "8px", fontSize: "10px", fontWeight: 600, background: "#10B45F", color: "#fff", padding: "1px 6px", borderRadius: "999px" }}>
                      수어 지원
                    </span>
                  </div>
                  <div style={{ padding: "12px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, margin: 0, lineHeight: 1.45 }}>{r.title}</p>
                    <p style={{ fontSize: "10px", color: "#747C78", margin: "4px 0 0" }}>
                      {r.date} · {r.duration}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #E5E8E7", borderRadius: "16px" }}>
              <EmptyState
                padding="24px 0 40px"
                titleWeight={500}
                title="최근 변환한 기록이 없어요"
                description="첫 영상을 시청하고 공농을 경험해보세요!"
                descriptionColor="#747C78"
                icon={
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                    <img src={recentEmptyIcon} alt="" style={{ width: "72px", height: "auto" }} />
                  </div>
                }
              />
            </div>
          )}
        </div>

        <div style={{ marginTop: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>내 그룹</h2>
            <button onClick={() => navigate("/history", { state: { tab: "groups" } })} style={{ background: "none", border: "none", fontSize: "14px", fontWeight: 500, color: "#10B45F", cursor: "pointer" }}>
              관리
            </button>
          </div>
          {groups.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
              {groups.map((g) => {
                const gitems = history.filter((h) => g.itemIds.includes(h.id));
                return (
                  <button
                    key={g.id}
                    onClick={() => navigate("/history")}
                    className="hover-card"
                    style={{ background: "#fff", border: "1px solid #E5E8E7", borderRadius: "16px", padding: "16px", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ position: "relative", width: "64px", height: "48px", flexShrink: 0 }}>
                      {gitems.slice(0, 3).map((h, i) => (
                        <div
                          key={h.id}
                          style={{
                            position: "absolute",
                            width: "44px",
                            height: "30px",
                            top: `${i * 5}px`,
                            left: `${i * 5}px`,
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: "2px solid #fff",
                            boxShadow: "0 1px 2px rgba(0,0,0,.1)",
                            zIndex: 3 - i,
                          }}
                        >
                          <img src={thumbOf(h.url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                        <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "#10B45F", flexShrink: 0 }}>
                          <path d={ICON.folder} />
                        </svg>
                        <p style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>{g.name}</p>
                      </div>
                      <p style={{ fontSize: "12px", color: "#747C78", margin: 0 }}>영상 {g.itemIds.length}개</p>
                    </div>
                    <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "#747C78", flexShrink: 0 }}>
                      <path d={ICON.chevronRight} />
                    </svg>
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              onClick={() => navigate("/history", { state: { tab: "groups" } })}
              className="hover-card"
              style={{ width: "100%", background: "#fff", border: "1px solid #E5E8E7", borderRadius: "16px", padding: "16px", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer", textAlign: "left" }}
            >
              <img src={groupPlaceholder} alt="" style={{ width: "44px", height: "44px", flexShrink: 0, objectFit: "contain" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>저장한 영상</p>
                <p style={{ fontSize: "12px", color: "#747C78", margin: 0 }}>영상 0개</p>
              </div>
              <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "#747C78", flexShrink: 0 }}>
                <path d={ICON.chevronRight} />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
