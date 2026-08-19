#include "wokwi-api.h"
#include <stdio.h>
#include <stdlib.h>

typedef struct {
  pin_t pin_vin_pos;
  pin_t pin_vin_neg;
  pin_t pin_vout_pos;
  pin_t pin_vout_neg;
} chip_state_t;

void chip_init() {
  chip_state_t *chip = malloc(sizeof(chip_state_t));
  chip->pin_vin_pos = pin_init("VIN+", INPUT);
  chip->pin_vin_neg = pin_init("VIN-", INPUT);
  chip->pin_vout_pos = pin_init("VOUT+", OUTPUT_HIGH);
  chip->pin_vout_neg = pin_init("VOUT-", OUTPUT_LOW);

  printf("[MT3608] Boost Converter Initialized: Step-Up 3.7V -> 5.0V Regulated\n");
}
