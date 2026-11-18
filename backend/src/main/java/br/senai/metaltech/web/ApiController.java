package br.senai.metaltech.web;

import br.senai.metaltech.service.*;
import br.senai.metaltech.repo.*;
import br.senai.metaltech.model.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.*;

@RestController
@RequestMapping("/api")
public class ApiController {
  private final IngestionService ingest;
  private final PieceRepository pieces;
  private final ReadingRepository readings;
  private final String ingestKey, adminKey;
  private final long staleSeconds;

  public ApiController(IngestionService ingest, PieceRepository pieces, ReadingRepository readings,
      @Value("${metaltech.ingest-key}") String ingestKey, @Value("${metaltech.admin-key}") String adminKey,
      @Value("${metaltech.tank-stale-seconds:10}") long staleSeconds) {
    this.ingest = ingest;
    this.pieces = pieces;
    this.readings = readings;
    this.ingestKey = ingestKey;
    this.adminKey = adminKey;
    this.staleSeconds = staleSeconds;
  }

  public record Batch(List<IngestionService.Sample> samples) {
  }

  @PostMapping("/ingest")
  public IngestionService.Result ingest(@RequestHeader(value = "X-Ingest-Key", required = false) String key,
      @RequestBody Batch batch) {
    if (key == null || !java.security.MessageDigest.isEqual(key.getBytes(java.nio.charset.StandardCharsets.UTF_8),
        ingestKey.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
      throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED,
          "Credencial de ingestao invalida");
    return ingest.ingest(batch.samples());
  }

  @GetMapping("/dashboard")
  public Map<String, Object> dashboard() {
    long metal = pieces.countByMaterial(Material.METAL), non = pieces.countByMaterial(Material.NON_METAL);
    List<Piece> recent = pieces.findTop50ByOrderByOccurredAtDesc();
    List<SensorReading> rs = readings.findTop1000ByOrderByObservedAtDesc();
    SensorReading latest = rs.isEmpty() ? null : rs.get(0);
    SensorReading lastTank = readings.findTopByDistanceCmIsNotNullOrderByObservedAtDesc().orElse(null);
    boolean fresh = lastTank != null && lastTank.getObservedAt().isAfter(Instant.now().minusSeconds(staleSeconds));
    Map<String, Object> tank = new LinkedHashMap<>();
    tank.put("levelPercent", fresh ? Math.round(lastTank.getTankLevel() * 10) / 10.0 : null);
    tank.put("distanceCm", fresh ? Math.round(lastTank.getDistanceCm() * 10) / 10.0 : null);
    tank.put("rawHex", fresh ? String.format("%04X", lastTank.getX01Raw()) : null);
    tank.put("status", fresh ? "OK" : "INDISPONIVEL");
    List<Map<String, Object>> logs = recent.stream().limit(20).map(p -> {
      Map<String, Object> l = new LinkedHashMap<>();
      l.put("id", p.getId());
      l.put("timestamp", p.getOccurredAt().atZone(ZoneId.of("America/Sao_Paulo")).toLocalTime()
          .truncatedTo(ChronoUnit.SECONDS).toString());
      l.put("type", "INFO");
      l.put("message", "Peça " + (p.getMaterial() == Material.METAL ? "metálica" : "não metálica") + " registrada");
      return l;
    }).toList();
    List<Piece> ordered = new ArrayList<>(recent);
    Collections.reverse(ordered);
    long a = metal - recent.stream().filter(p -> p.getMaterial() == Material.METAL).count(),
        b = non - recent.stream().filter(p -> p.getMaterial() == Material.NON_METAL).count();
    List<Map<String, Object>> history = new ArrayList<>();
    for (Piece p : ordered) {
      if (p.getMaterial() == Material.METAL)
        a++;
      else
        b++;
      Map<String, Object> h = new LinkedHashMap<>();
      h.put("time", p.getOccurredAt().atZone(ZoneId.of("America/Sao_Paulo"))
          .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss")));
      h.put("metalicas", a);
      h.put("naoMetalicas", b);
      h.put("nivelTanque", null);
      history.add(h);
    }
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("metallicCount", metal);
    result.put("nonMetallicCount", non);
    result.put("conveyorRunning", null);
    result.put("activeSensor",
        latest == null ? null
            : latest.getX03Raw() != null && latest.getX03Raw() < 20000 ? "inductive"
                : latest.getX02Raw() != null && latest.getX02Raw() >= 1000 ? "capacitive" : null);
    result.put("lastReadingAt", latest == null ? null : latest.getObservedAt().toString());
    result.put("lastItemType",
        recent.isEmpty() ? null : recent.get(0).getMaterial() == Material.METAL ? "metal" : "nonmetal");
    result.put("tank", tank);
    result.put("logs", logs);
    result.put("history", history);
    result.put("sensors",
        Map.of("connected", latest != null && latest.getObservedAt().isAfter(Instant.now().minusSeconds(10))
            && (latest.getX02Raw() != null || latest.getX03Raw() != null)));
    return result;
  }

  @GetMapping("/pieces")
  public List<Piece> pieces() {
    return pieces.findTop50ByOrderByOccurredAtDesc();
  }

  @GetMapping("/readings")
  public List<SensorReading> readings() {
    return readings.findTop1000ByOrderByObservedAtDesc();
  }

  @GetMapping("/analytics/summary")
  public Map<String, Object> analytics() {
    List<Piece> recent = pieces.findByOccurredAtAfterOrderByOccurredAtAsc(Instant.now().minusSeconds(3600));
    Map<Instant, Long> byMinute = recent.stream()
        .collect(Collectors.groupingBy(p -> p.getOccurredAt().truncatedTo(ChronoUnit.MINUTES), Collectors.counting()));
    double[] values = byMinute.values().stream().mapToDouble(Long::doubleValue).toArray();
    double mean = values.length == 0 ? 0 : Arrays.stream(values).average().orElse(0);
    double variance = Arrays.stream(values).map(v -> (v - mean) * (v - mean)).average().orElse(0);
    List<Double> tank = readings.findTop1000ByOrderByObservedAtDesc().stream().map(SensorReading::getTankLevel)
        .filter(Objects::nonNull).sorted().toList();
    Double median = tank.isEmpty() ? null
        : (tank.size() % 2 == 0 ? (tank.get(tank.size() / 2 - 1) + tank.get(tank.size() / 2)) / 2
            : tank.get(tank.size() / 2));
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("piecesPerMinuteMean", mean);
    result.put("piecesPerMinuteStdDev", Math.sqrt(variance));
    result.put("tankMedian", median);
    result.put("tankOutliers", null);
    result.put("notes", "Estatísticas exploratórias; análise completa em analytics/analyze.py");
    return result;
  }

  @DeleteMapping("/pieces")
  public Map<String, Object> clear(@RequestHeader(value = "X-Admin-Key", required = false) String key) {
    if (key == null || !java.security.MessageDigest.isEqual(key.getBytes(java.nio.charset.StandardCharsets.UTF_8),
        adminKey.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
      throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED);
    pieces.deleteAll();
    return Map.of("deleted", true);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Map<String, String> invalid(IllegalArgumentException ex) {
    return Map.of("error", ex.getMessage());
  }
}
