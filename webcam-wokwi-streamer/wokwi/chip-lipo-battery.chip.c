#include "wokwi-api.h"
#include <stdio.h>
#include <stdlib.h>

typedef struct {
  pin_t pin_pos;
  pin_t pin_neg;
} chip_state_t;

void chip_init() {
  chip_state_t *chip = malloc(sizeof(chip_state_t));
  chip->pin_pos = pin_init("POS", OUTPUT_HIGH);
  chip->pin_neg = pin_init("NEG", OUTPUT_LOW);

  printf("[LiPo 3.7V] Battery Cell Connected (Nominal 3.7V, 350mAh)\n");
}
