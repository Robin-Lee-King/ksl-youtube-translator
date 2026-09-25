import { useModal } from "../../../state/ModalContext";
import InfoModal from "./InfoModal";
import ProfileModal from "./ProfileModal";
import NewGroupModal, { type NewGroupArg } from "./NewGroupModal";
import AddGroupModal, { type AddGroupArg } from "./AddGroupModal";
import FindIdModal from "./FindIdModal";
import FindPwModal from "./FindPwModal";
import SignupModal from "./SignupModal";

export default function ModalRoot() {
  const { modal } = useModal();
  if (!modal) return null;

  switch (modal.type) {
    case "info":
      return <InfoModal label={modal.arg as string} />;
    case "profile":
      return <ProfileModal />;
    case "new-group":
      return <NewGroupModal arg={modal.arg as NewGroupArg} />;
    case "add-group":
      return <AddGroupModal arg={modal.arg as AddGroupArg} />;
    case "find-id":
      return <FindIdModal />;
    case "find-pw":
      return <FindPwModal />;
    case "signup":
      return <SignupModal />;
    default:
      return null;
  }
}
