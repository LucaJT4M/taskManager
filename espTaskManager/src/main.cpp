#include <Adafruit_SH110X.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <vector>

// configs für get requests
const char* ssid = "MikroTik-AF2E92"; // man brauch ssid vom Netzwerk 
String API_URL = "http://192.168.88.69:8000/get_tasks_for_esp"; // und die api url

// Für SH1106 Displays nutzt man diesen Konstruktor:
Adafruit_SH1106G display(128, 64, &Wire, -1);

#define button_refresh 17
#define button_two 15
#define button_three 16


void write_to_monitor(String text) {
    display.clearDisplay();
    display.setCursor(0, 10);
    display.println(text);
    display.display();
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22); // Definiere deine I2C Pins explizit1
  pinMode(button_refresh, INPUT_PULLUP);
  pinMode(button_two, INPUT_PULLUP);
  pinMode(button_three, INPUT_PULLUP);
  
  // SH1106 nutzt eine leicht andere Initialisierung:
  if(!display.begin(0x3C, true)) { 
    for(;;); 
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);

  write_to_monitor("Begin");

  // wifi setup
  WiFi.begin(ssid, "");
  Serial.println("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("Connected");
  
  if (WiFi.status() == WL_CONNECTED) {
    write_to_monitor("Connected ready for data refresh");
    /* HTTPClient http;
    
    http.begin(API_URL);  // Start connection
    int httpCode = http.GET();

    if (httpCode > 0) {
      Serial.printf("HTTP Response Code: %d\n", httpCode);

      String payload = http.getString();
      Serial.println("Response:");
      Serial.println(payload);
    } else {
      Serial.printf("Request failed: %s\n", http.errorToString(httpCode).c_str());
    } */

    /* http.end(); */
  }
}

class Task {
  public:
    int id;
    String title;
    bool checked;

    Task parse_json(const String& json_string) {
      Task task;
      JsonDocument doc;
      if (!deserializeJson(doc, json_string)) {
        task.id = doc["id"] | 0;
        task.title = doc["title"] | "";
        task.checked = doc["checked"] | false; 
      }

      return task;
    }
};

std::vector<Task> parse_list_from_json(const String& json) {
    std::vector<Task> tasks;
    JsonDocument doc;

    DeserializationError error = deserializeJson(doc, json);
    if (error) {
        Serial.print("JSON parse failed: ");
        Serial.println(error.c_str());
        return tasks;
    }

    JsonArray array = doc.as<JsonArray>();

    tasks.clear();

    for (JsonObject obj : array) {
        Task task;

        task.id = obj["id"] | 0;
        task.title = obj["title"] | "";
        task.checked = obj["checked"] | false;

        tasks.push_back(task);
    }

    Serial.printf("Loaded %d tasks\n", tasks.size());
    return tasks;
}

class Button {
  public:
    int last_state = HIGH;
    int state;
    String _name;

    Button(String name) {
      _name = name;
    }

    bool Update() {
      bool got_pressed = false;
      if (last_state == LOW && state == HIGH) {
        Serial.println(_name);
        got_pressed = true;
      } else {
        got_pressed = false;
      }
      last_state = state;
      return got_pressed;
    }
};

Button refresh_btn("api refresh");
Button btn_two("button two");
Button btn_three("button three");

String get_tasks_from_api() {
  HTTPClient http;

  http.begin(API_URL);  // Start connection
  int httpCode = http.GET();

  if (httpCode > 0) {
    Serial.printf("HTTP Response Code: %d\n", httpCode);

    String payload = http.getString();
    Serial.println("Response:");
    Serial.println(payload);
    http.end();
    return payload;
  } else {
    Serial.printf("Request failed: %s\n", http.errorToString(httpCode).c_str());
    http.end();
    return "";
  }
}

void print_task_ui(Task task, int this_index, int list_size) {
  display.clearDisplay();
  display.setCursor(0, 10);
  display.print("Id: ");
  display.println(task.id);

  display.setCursor(0, 20);
  display.print("Titel: ");
  display.println(task.title);

  display.setCursor(0, 30);
  if (task.checked) {
    display.println("Erledigt: Ja");
  } else {
    display.println("Erledigt: Nein");
  }
  display.setCursor(0, 50);
  display.println(String(this_index + 1) + "/" + String(list_size));
  display.display();
}

std::vector<Task> tasks;
int current_index = 0;

void loop() {
  // Put your main code here to run repeatedly
  refresh_btn.state = digitalRead(button_refresh);
  btn_two.state = digitalRead(button_two);
  btn_three.state = digitalRead(button_three);

  bool got_refreshed = refresh_btn.Update();
  bool task_up = btn_two.Update();
  bool task_down = btn_three.Update();

  if (got_refreshed) {
    tasks = parse_list_from_json(get_tasks_from_api());
    current_index = 0;
  }

  if (task_up) {
    if (current_index + 1 < tasks.size()) {
      current_index += 1;
    }
  }

  if (task_down) {
    if (current_index > 0) {
      current_index -= 1;
    }
  }

  if (!tasks.empty()) {
    print_task_ui(tasks[current_index], current_index, tasks.size());
  }
}