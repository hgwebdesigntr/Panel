declare module "react-google-recaptcha" {
  import * as React from "react";

  export interface ReCAPTCHAProps {
    sitekey: string;
    theme?: "light" | "dark";
    size?: "compact" | "normal" | "invisible";
    onChange?: (token: string | null) => void;
    onExpired?: () => void;
    onErrored?: () => void;
  }

  export default class ReCAPTCHA extends React.Component<ReCAPTCHAProps> {
    getValue(): string | null;
    reset(): void;
    execute(): void;
  }
}
