declare module 'screenshot-desktop' {
  function screenshot(): Promise<Buffer>;
  export = screenshot;
}
