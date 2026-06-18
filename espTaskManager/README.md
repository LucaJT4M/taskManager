# ESP32 Task Manager

A simple ESP32 project that fetches tasks from a REST API and displays them on an SH1106 OLED display. The project uses three buttons to refresh the task list and navigate through tasks.

## Features

- Connects ESP32 to Wi-Fi
- Fetches task JSON from a configurable API endpoint
- Displays task details on an SH1106 display
- Uses three buttons for:
  - Refresh API data
  - Move to next task
  - Move to previous task

## Hardware

- ESP32 board (configured for `upesy_wroom` in `platformio.ini`)
- SH1106 OLED display (128x64)
- Three momentary push buttons
- I2C wiring for the display

## Wiring

- OLED I2C `SDA` -> ESP32 GPIO 21
- OLED I2C `SCL` -> ESP32 GPIO 22
- Display I2C address: `0x3C`
- Button 1 (refresh) -> GPIO 17
- Button 2 (next task) -> GPIO 15
- Button 3 (previous task) -> GPIO 16
- Buttons use `INPUT_PULLUP`, so wire one side to the GPIO and the other side to ground.

## Configuration

Update the following values in `src/main.cpp` before building:

- `ssid` - Wi-Fi network name
- `API_URL` - Your task API endpoint

Example:

```cpp
const char* ssid = "MikroTik-AF2E92";
String API_URL = "http://192.168.88.69:8000/get_tasks_for_esp";
```

## Dependencies

The project uses PlatformIO and the following libraries configured in `platformio.ini`:

- `Adafruit SH110X`
- `Adafruit GFX Library`
- `ArduinoJson`
- `Arduino_JSON`

## Build & Upload

1. Install [PlatformIO](https://platformio.org/).
2. Open the project in PlatformIO or VS Code with the PlatformIO extension.
3. Verify the upload port in `platformio.ini`:

```ini
upload_port = /dev/ttyUSB0
```

4. Build and upload to the ESP32 using PlatformIO.

## Usage

- Power the ESP32 and wait for it to connect to Wi-Fi.
- Press the refresh button to fetch the latest task list from the API.
- Use the other buttons to scroll through tasks.
- The display shows:
  - Task ID
  - Task title
  - Completion status
  - Current task index / total tasks

## JSON API Format

The API should return a JSON array of task objects, for example:

```json
[
  {"id": 1, "title": "Buy groceries", "checked": false},
  {"id": 2, "title": "Clean room", "checked": true}
]
```

## Notes

- The display is initialized using `display.begin(0x3C, true)` for SH1106.
- The code currently does not send updates back to the API; it only reads task data.
- The initial Wi-Fi password is currently blank in the source; set the password if needed.

## License

This repository does not include a license file. Add one if you want to permit reuse.
