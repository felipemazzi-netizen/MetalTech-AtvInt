package br.senai.metaltech.repo;

import br.senai.metaltech.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PieceRepository extends JpaRepository<Piece, Long> {
    long countByMaterial(Material material);

    List<Piece> findTop50ByOrderByOccurredAtDesc();

    List<Piece> findByOccurredAtAfterOrderByOccurredAtAsc(java.time.Instant t);
}
