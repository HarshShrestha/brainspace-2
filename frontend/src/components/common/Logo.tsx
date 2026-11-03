import { Icon } from "./Icon";

export function Logo() {
  return (
    <span className="logo">
      <Icon name="neurology" className="logo__mark" />
      <span>
        brainspace<span className="logo__dot">.</span>
      </span>
    </span>
  );
}
