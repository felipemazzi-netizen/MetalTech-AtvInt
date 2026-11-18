package br.senai.metaltech.web;

import br.senai.metaltech.model.SensorDevice;
import br.senai.metaltech.repo.SensorDeviceRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@RestController
@RequestMapping("/api/sensors")
public class SensorDeviceController {
    private final SensorDeviceRepository repo;
    private final String adminKey;

    public SensorDeviceController(SensorDeviceRepository repo, @Value("${metaltech.admin-key}") String adminKey) {
        this.repo = repo;
        this.adminKey = adminKey;
    }

    public record Form(Integer port, String sensorType, String description) {
    }

    private void check(String key) {
        if (key == null || !MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),
                adminKey.getBytes(StandardCharsets.UTF_8)))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    }

    private void validate(Form f) {
        if (f == null || f.port() == null || f.port() < 1 || f.port() > 8 || f.sensorType() == null
                || f.sensorType().isBlank() || f.sensorType().length() > 40)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados invalidos");
    }

    @GetMapping
    public List<SensorDevice> all() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public SensorDevice one(@PathVariable Long id) {
        return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SensorDevice create(@RequestHeader(value = "X-Admin-Key", required = false) String key,
            @RequestBody Form f) {
        check(key);
        validate(f);
        return repo.save(new SensorDevice(f.port(), f.sensorType(), f.description()));
    }

    @PutMapping("/{id}")
    public SensorDevice update(@RequestHeader(value = "X-Admin-Key", required = false) String key,
            @PathVariable Long id, @RequestBody Form f) {
        check(key);
        validate(f);
        SensorDevice d = one(id);
        d.update(f.port(), f.sensorType(), f.description());
        return repo.save(d);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader(value = "X-Admin-Key", required = false) String key, @PathVariable Long id) {
        check(key);
        if (!repo.existsById(id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        repo.deleteById(id);
    }
}
