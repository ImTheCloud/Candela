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
        <div class="stack" style="--gap: 12px;">
          <p>Un copil nu poate avea același prenume ca cel al contului: <strong>{name}</strong> este deja prenumele tău.</p>
          <p class="muted">
            {fromProfile ? (
              <>
                Dacă ai creat inițial contul cu numele copilului, apasă pe pictograma de editare (creion) din dreptul profilului tău pentru a trece datele tale de părinte. Vei putea apoi adăuga copilul cu acest prenume.
              </>
            ) : (
              <>
                Sus scrie datele tale de părinte, iar mai jos prenumele fiecărui copil. Copiii vor juca direct de pe contul tău.
              </>
            )}
          </p>
          <p class="muted small">
            Dacă purtați amândoi același prenume, adaugă o mică distincție pentru copil (de exemplu un al doilea prenume sau „Jr.”).
          </p>
          <button type="button" class="btn btn-primary btn-block" onClick={close}>Am înțeles</button>
        </div>
      </>)}
    </Modal>
  );
}
