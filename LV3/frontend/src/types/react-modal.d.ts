declare module 'react-modal' {
  import { Component, ReactNode } from 'react';

  interface ModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    children?: ReactNode; // children プロパティを追加
    // 他のプロパティも必要に応じて追加
  }

  export default class Modal extends Component<ModalProps> {}
}
