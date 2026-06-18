# ESP32 Task Manager

Ein einfaches ESP32-Projekt, das Aufgaben von einer REST-API abruft und auf einem SH1106 OLED-Display anzeigt. Das Projekt verwendet drei Tasten, um die Aufgabenliste zu aktualisieren und durch Aufgaben zu navigieren.

## Funktionen

- Verbindet den ESP32 mit dem WLAN
- Ruft Aufgaben im JSON-Format von einem konfigurierbaren API-Endpunkt ab
- Zeigt Aufgabendetails auf einem SH1106-Display an
- Verwendet drei Tasten für:
  - Aktualisieren der API-Daten
  - Wechsel zur nächsten Aufgabe
  - Wechsel zur vorherigen Aufgabe

## Hardware

- ESP32-Board (in `platformio.ini` als `upesy_wroom` konfiguriert)
- SH1106 OLED-Display (128x64)
- Drei Drucktasten
- I2C-Verkabelung für das Display

## Verkabelung

- OLED I2C `SDA` -> ESP32 GPIO 21
- OLED I2C `SCL` -> ESP32 GPIO 22
- Display-I2C-Adresse: `0x3C`
- Taste 1 (Aktualisieren) -> GPIO 17
- Taste 2 (nächste Aufgabe) -> GPIO 15
- Taste 3 (vorherige Aufgabe) -> GPIO 16
- Die Tasten verwenden `INPUT_PULLUP`, daher wird eine Seite an den GPIO und die andere Seite an Masse angeschlossen.

## Konfiguration

Aktualisiere vor dem Kompilieren die folgenden Werte in `src/main.cpp`:

- `ssid` - WLAN-Netzwerkname
- `API_URL` - Deine API-URL für Aufgaben

Beispiel:

```cpp
const char* ssid = "MikroTik-AF2E92";
String API_URL = "http://192.168.88.69:8000/get_tasks_for_esp";
```

## Abhängigkeiten

Das Projekt verwendet PlatformIO und folgende Bibliotheken, die in `platformio.ini` konfiguriert sind:

- `Adafruit SH110X`
- `Adafruit GFX Library`
- `ArduinoJson`
- `Arduino_JSON`

## Build & Upload

1. Installiere [PlatformIO](https://platformio.org/).
2. Öffne das Projekt in PlatformIO oder VS Code mit der PlatformIO-Erweiterung.
3. Überprüfe den Upload-Port in `platformio.ini`:

```ini
upload_port = /dev/ttyUSB0
```

4. Baue das Projekt und lade es auf den ESP32 hoch.

## Verwendung

- Schalte den ESP32 ein und warte, bis er sich mit dem WLAN verbindet.
- Drücke die Aktualisieren-Taste, um die neueste Aufgabenliste von der API zu laden.
- Verwende die anderen Tasten, um durch die Aufgaben zu blättern.
- Das Display zeigt an:
  - Aufgaben-ID
  - Aufgabentitel
  - Erledigt-Status
  - Aktuelle Aufgabe / Gesamtanzahl

## JSON-API-Format

Die API sollte ein JSON-Array von Aufgabenobjekten zurückliefern, zum Beispiel:

```json
[
  {"id": 1, "title": "Lebensmittel kaufen", "checked": false},
  {"id": 2, "title": "Zimmer aufräumen", "checked": true}
]
```

## Hinweise

- Das Display wird für SH1106 mit `display.begin(0x3C, true)` initialisiert.
- Der Code sendet derzeit keine Änderungen an die API zurück; er liest nur die Aufgabe.
- Das WLAN-Passwort ist in der Quelle derzeit leer; setze das Passwort bei Bedarf.

## Lizenz

Dieses Repository enthält keine Lizenzdatei. Füge eine hinzu, wenn du die Wiederverwendung erlauben möchtest.
