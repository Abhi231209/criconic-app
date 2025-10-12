// components/Popup.js
import React from 'react';
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, ButtonText } from "@gluestack-ui/themed";

const CustomPopup = ({ isOpen, onClose, children, title }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        {title && (
          <ModalHeader>
            <ButtonText size="lg">{title}</ButtonText>
          </ModalHeader>
        )}

        <ModalBody>
          {children}
        </ModalBody>

        <ModalFooter>
          <Button action="secondary" onPress={onClose}>
            <ButtonText>Close</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CustomPopup;
