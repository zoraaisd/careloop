declare module '@emailjs/nodejs' {
  export type EmailJSResponseStatus = {
    status: number;
    text: string;
  };

  export type EmailJSOptions = {
    publicKey?: string;
    privateKey?: string;
  };

  const emailjs: {
    send: (
      serviceID: string,
      templateID: string,
      templateParams?: Record<string, unknown>,
      options?: EmailJSOptions,
    ) => Promise<EmailJSResponseStatus>;
  };

  export default emailjs;
}
