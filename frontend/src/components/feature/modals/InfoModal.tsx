import ModalShell from "../../common/ModalShell";
import { INFO } from "../../../constants";

export default function InfoModal({ label }: { label: string }) {
  return (
    <ModalShell title={label} wide>
      <p style={{ fontSize: "14px", lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{INFO[label]}</p>
    </ModalShell>
  );
}
