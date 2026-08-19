#include "wokwi-api.h"
#include <stdio.h>
#include <stdlib.h>

typedef struct {
  pin_t pin_in_pos;
  pin_t pin_in_neg;
  pin_t pin_b_pos;
  pin_t pin_b_neg;
  pin_t pin_out_pos;
  pin_t pin_out_neg;
} chip_state_t;

void chip_init() {
  chip_state_t *chip = malloc(sizeof(chip_state_t));
  chip->pin_in_pos = pin_init("IN+", INPUT);
  chip->pin_in_neg = pin_init("IN-", INPUT);
  chip->pin_b_pos = pin_init("B+", INPUT);
  chip->pin_b_neg = pin_init("B-", INPUT);
  chip->pin_out_pos = pin_init("OUT+", OUTPUT_HIGH);
  chip->pin_out_neg = pin_init("OUT-", OUTPUT_LOW);

  printf("[TP4056] Module Charging Controller Initialized (3.7V - 4.2V)\n");
}
