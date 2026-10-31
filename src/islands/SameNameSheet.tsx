import Modal, { CloseButton } from './Modal';

/** Says why a child cannot have the parent's first name, and what to write instead. */
export default function SameNameSheet({ name, fromProfile = false, onClose }: { name: string; fromProfile?: boolean; onClose: () => void }) {
  return (
    <Modal role="alertdialog" labelledby="sn-title" onClose={onClose}>
      {(close) => (<>
        <div class="sheet-top">
          <h2 id="sn-title">Același prenume ca părintele</h2>
          <CloseButton onClick={close} />
        </div>
        <div class="stack">
          <p>Un copil nu poate avea același prenume ca părintele: <strong>{name}</strong> este deja prenumele contului.</p>
          <p class="muted">Contul este al părintelui. {fromProfile
            ? 'Copilul se adaugă aici cu prenumele lui și joacă din contul tău. Dacă ai creat contul cu prenumele copilului, scrie-ne un email și îl corectăm.'
            : 'Sus scrie prenumele și numele tău, iar la copii prenumele fiecărui copil. Copiii joacă apoi din contul tău, fiecare cu numele lui.'}</p>
          <button type="button" class="btn btn-primary btn-block" onClick={close}>Am înțeles</button>
        </div>
      </>)}
    </Modal>
  );
}
