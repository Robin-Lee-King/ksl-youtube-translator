import logo from "../../assets/logo.png";

export default function Footer() {
  return (
    <footer style={{ background: "#fff", borderTop: "1px solid #E5E8E7", padding: "40px 24px" }}>
      <div style={{ maxWidth: "1024px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "32px" }}>
        <div>
          <img src={logo} alt="공농" style={{ height: "28px", width: "auto" }} />
          <p style={{ fontSize: "12px", color: "#747C78", lineHeight: 1.7, margin: "8px 0 0" }}>
            영상 속 말들을, 수어로 잇는 공농.
            <br />
            농인의 일상을 더 편리하게,
            <br />
            소통의 장벽을 낮춥니다.
          </p>
        </div>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 12px" }}>서비스</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "#747C78" }}>
            <li>
              <a href="#about" className="hover-dark" style={{ color: "inherit", textDecoration: "none" }}>
                서비스 소개
              </a>
            </li>
            <li>
              <a href="#faq" className="hover-dark" style={{ color: "inherit", textDecoration: "none" }}>
                FAQ
              </a>
            </li>
            <li>
              <a href="#how" className="hover-dark" style={{ color: "inherit", textDecoration: "none" }}>
                이용 방법
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 12px" }}>지원</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "#747C78" }}>
            <li>
              <a href="#faq" className="hover-dark" style={{ color: "inherit", textDecoration: "none" }}>
                자주 묻는 질문
              </a>
            </li>
            <li>이용약관</li>
            <li>개인정보처리방침</li>
          </ul>
        </div>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 12px" }}>문의</p>
          <p style={{ fontSize: "12px", color: "#747C78", margin: "0 0 12px" }}>hello@gongnong.com</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <span style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#F0FAF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "#747C78" }}>
                <path d="M21.58 7.19c-.23-.86-.9-1.54-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42c-.86.23-1.53.91-1.76 1.77C2 8.76 2 12 2 12s0 3.24.42 4.81c.23.86.9 1.54 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42c.86-.23 1.53-.91 1.76-1.77C22 15.24 22 12 22 12s0-3.24-.42-4.81zM10 15V9l5.2 3-5.2 3z" />
              </svg>
            </span>
            <span style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#F0FAF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "#747C78" }}>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </span>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: "1024px", margin: "32px auto 0", paddingTop: "24px", borderTop: "1px solid #E5E8E7", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "#747C78", margin: 0 }}>© 2026 공농. All rights reserved.</p>
      </div>
    </footer>
  );
}
