declare module 'react-modal' {
  import { Component, ReactNode } from 'react';

  interface ModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    children?: ReactNode; // children プロパティを追加
    style?: any; // 追加: styleプロパティ
    // 他のプロパティも必要に応じて追加
  }

  export default class Modal extends Component<ModalProps> {
    static setAppElement(el: string | HTMLElement): void; // setAppElement メソッドを追加
  }
}
