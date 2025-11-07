declare module "sshpk" {
  export interface PublicKey {
    toString(format: string): string;
  }

  export interface PrivateKey {
    toPublic(): PublicKey;
    toString(format: string): string;
  }

  export function generatePrivateKey(
    type: string,
    options?: { comment?: string }
  ): PrivateKey;

  const sshpk: {
    generatePrivateKey: typeof generatePrivateKey;
  };

  export default sshpk;
}
