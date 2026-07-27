declare module 'kavenegar' {
  export interface KavenegarResponse {
    return: {
      status: number;
      message: string;
      remain: number;
    };
    entries: Array<{
      messageid: number;
      message: string;
      status: number;
      statustext: string;
      sender: string;
      receptor: string;
      date: number;
      cost: number;
    }>;
  }

  interface KavenegarApiInstance {
    VerifyLookup(
      options: {
        receptor: string;
        token: string;
        template: string;
        token2?: string;
        token3?: string;
        type?: string;
      },
      callback: (error: any, response: KavenegarResponse) => void
    ): void;
    Send(
      options: {
        receptor: string;
        message: string;
        sender?: string;
      },
      callback: (error: any, response: KavenegarResponse) => void
    ): void;
  }

  function KavenegarApi(options: { apikey: string }): KavenegarApiInstance;

  const Kavenegar: {
    KavenegarApi: typeof KavenegarApi;
  };

  export default Kavenegar;
}
