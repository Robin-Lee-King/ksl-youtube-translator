import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVideo } from "../state/VideoContext";
import { useConvertJob } from "../hooks/useConvertJob";
import { progressForStatus, resolveVideoUrl, stepIndexForStatus, thumbOf, vidId } from "../utils/video";
import { MOCK_PROC_STEPS, MOCK_PROC_TOTAL } from "../mocks/processingSteps";
import ErrorState from "../components/common/ErrorState";
import Loading from "../components/common/Loading";
import logo from "../assets/logo.png";

export default function ProcessingPage() {
  const navigate = useNavigate();
  const { currentUrl, setCurrentUrl, addHistoryItem, setCurrentJob } = useVideo();
  const { job, error, start, resume } = useConvertJob();
  const startedRef = useRef(false);
  const navigatedRef = useRef(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    resume().then(async (resumed) => {
      const terminal = resumed?.status === "COMPLETED" || resumed?.status === "FAILED";
      if (resumed && !(currentUrl && terminal)) {
        setCurrentUrl(resumed.url);
      } else if (currentUrl) {
        await start(currentUrl);
      } else {
        navigate("/home");
        return;
      }
      setInitialized(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl]);

  useEffect(() => {
    if (initialized && currentUrl && job?.status === "COMPLETED" && !navigatedRef.current) {
      navigatedRef.current = true;
      window.setTimeout(() => {
        setCurrentJob(job);
        addHistoryItem({
          id: job.job_id,
          title: vidId(currentUrl) ? `YouTube 영상 (${vidId(currentUrl)})` : "유튜브 영상",
          url: currentUrl,
          date: new Date().toISOString().slice(0, 10),
          status: "완료",
          duration: "0:00", // TODO: use the real source duration once the backend returns it on the job.
          resultVideoUrl: resolveVideoUrl(job.result?.video_url),
        });
        navigate("/player");
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, currentUrl, initialized]);

  function retry() {
    navigatedRef.current = false;
    void start(currentUrl);
  }

  const progress = job ? progressForStatus(job.status) : 0;
  const procStep = job ? stepIndexForStatus(job.status) : 0;
  const failed = job?.status === "FAILED" || !!error;
  const failureMessage = error ?? job?.error_message ?? "변환에 실패했습니다.";

  const etaLabel = failed
    ? "변환에 실패했습니다"
    : progress < 100
      ? `완료까지 약 ${Math.max(0, Math.ceil(((100 - progress) / 100) * (MOCK_PROC_TOTAL / 1000)))}초 남았습니다`
      : "변환이 완료되었습니다!";

  return (
    <div style={{ minHeight: "100vh", background: "#F0FAF5", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #E5E8E7" }}>
        <div style={{ maxWidth: "1024px", margin: "0 auto", padding: "0 24px", height: "56px", display: "flex", alignItems: "center" }}>
          <img src={logo} alt="공농" style={{ height: "34px", width: "auto" }} />
        </div>
      </header>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <div style={{ width: "100%", maxWidth: "448px" }}>
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <p style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>수어 영상을 생성하고 있어요</p>
            <p style={{ fontSize: "14px", color: "#747C78", margin: "6px 0 0" }}>잠시만 기다려주세요</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid #E5E8E7", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}>
            <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", marginBottom: "20px", background: "#F0FAF5" }}>
              <img src={thumbOf(currentUrl)} alt="썸네일" style={{ width: "100%", height: "128px", objectFit: "cover", opacity: 0.7, display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.4), transparent)" }} />
            </div>
            <p style={{ fontSize: "12px", color: "#747C78", margin: "0 0 16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              🔗 {currentUrl}
            </p>
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>변환 진행률</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: failed ? "#EF4444" : "#10B45F" }}>{progress}%</span>
              </div>
              <div style={{ height: "10px", background: "#E5E8E7", borderRadius: "999px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    borderRadius: "999px",
                    transition: "width .2s",
                    background: failed ? "#EF4444" : "linear-gradient(90deg, #8DDE98, #42C97A, #1BAA70)",
                  }}
                />
              </div>
              <p style={{ fontSize: "12px", color: failed ? "#EF4444" : "#747C78", margin: "8px 0 0" }}>{etaLabel}</p>
              {failed && <ErrorState message={failureMessage} />}
            </div>
            {!failed && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {MOCK_PROC_STEPS.map((st, i) => {
                  const isDone = i < procStep;
                  const active = i === procStep;
                  return (
                    <div key={st.label} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "12px", background: active ? "#F0FAF5" : "transparent" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "999px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: "12px",
                          fontWeight: 700,
                          background: isDone || active ? "#10B45F" : "#E5E8E7",
                          color: isDone || active ? "#fff" : "#747C78",
                        }}
                      >
                        {isDone ? "✓" : i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "14px", fontWeight: 500, margin: 0, color: active ? "#0B7A4D" : isDone ? "#171C19" : "#747C78" }}>{st.label}</p>
                        {active && (
                          <p style={{ fontSize: "12px", color: "#747C78", margin: "2px 0 0", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Loading size={12} />
                            {st.desc}
                          </p>
                        )}
                      </div>
                      {isDone && <span style={{ fontSize: "12px", color: "#10B45F", fontWeight: 500 }}>완료</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {failed && (
              <button
                onClick={retry}
                className="hover-primary"
                style={{ width: "100%", padding: "12px", background: "#10B45F", color: "#fff", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
              >
                다시 시도
              </button>
            )}
          </div>
          <button
            onClick={() => navigate("/home")}
            className="hover-dark"
            style={{ width: "100%", marginTop: "16px", padding: "12px", fontSize: "14px", color: "#747C78", background: "none", border: "none", cursor: "pointer" }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
