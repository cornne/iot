#include "wokwi-api.h"
#include <stdio.h>
#include <stdlib.h>

void chip_init() {
  pin_init("IN+", INPUT);
  pin_init("IN-", INPUT);
  pin_init("B+", INPUT);
  pin_init("B-", INPUT);
  pin_init("OUT+", OUTPUT_HIGH);
  pin_init("OUT-", OUTPUT_LOW);

  printf("[TP4056] Module Charging 3.7V - 4.2V Initialized!\n");
}
