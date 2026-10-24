import { Link } from "react-router-dom";

export const statusLabels = {
  LOST: "Desaparecido",
  FOUND: "Encontrado",
  REUNITED: "De volta em casa",
};

export const typeLabels = { DOG: "Cachorro", CAT: "Gato", OTHER: "Outro animal" };

export function petTypeLabel(pet) {
  if (pet.type === "OTHER" && typeof pet.otherAnimalType === "string" && pet.otherAnimalType.trim()) {
    return pet.otherAnimalType.trim();
  }
  return typeLabels[pet.type] ?? "Animal";
}

export function PetCard({ pet }) {
  return (
    <article className="pet-card">
      <div className={`pet-card-illustration type-${pet.type.toLowerCase()}`}>
        {pet.photoUrl ? (
          <img className="pet-photo-image" src={pet.photoUrl} alt={`Foto de ${pet.name}`} loading="lazy" />
        ) : (
          <><span aria-hidden="true">{pet.type === "DOG" ? "🐕" : pet.type === "CAT" ? "🐈" : "🐾"}</span><span className="card-glow" /></>
        )}
      </div>
      <div className="pet-card-body">
        <span className={`status-pill status-${pet.status.toLowerCase()}`}>
          <span className="status-dot" />{statusLabels[pet.status]}
        </span>
        <div className="card-title-row">
          <h3>{pet.name}</h3>
          <span className="pet-type">{petTypeLabel(pet)}</span>
        </div>
        <p className="pet-place">📍 {pet.neighborhood}, {pet.city}</p>
        <p className="pet-excerpt">{pet.description}</p>
        <Link className="card-link" to={`/pets/${pet.id}`}>
          Ver detalhes <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
