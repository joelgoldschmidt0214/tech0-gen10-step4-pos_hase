declare module 'react-modal' {
  import { Component, ReactNode } from 'react';

  export interface Styles {
    content?: React.CSSProperties;
    overlay?: React.CSSProperties;
  }

  interface ModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    children?: ReactNode; // children プロパティを追加
    style?: Styles; // 型を明示
    // 他のプロパティも必要に応じて追加
  }

  export default class Modal extends Component<ModalProps> {
    static setAppElement(el: string | HTMLElement): void; // setAppElement メソッドを追加
  }
}
