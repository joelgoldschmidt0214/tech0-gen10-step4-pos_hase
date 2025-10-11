// @undecaf/zbar-wasm の最低限の宣言（必要に応じて any を具体化していってください）
declare module '@undecaf/zbar-wasm';

// .wasm を import する場合の宣言（public 配下から fetch するだけなら不要）
declare module '*.wasm' {
  const url: string;
  export default url;
}
