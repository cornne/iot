#include "wokwi-api.h"
#include <stdio.h>
#include <stdlib.h>

void chip_init() {
  pin_init("VIN+", INPUT);
  pin_init("VIN-", INPUT);
  pin_init("VOUT+", OUTPUT_HIGH);
  pin_init("VOUT-", OUTPUT_LOW);

  printf("[MT3608] Boost Converter 3.7V -> 5.0V Initialized!\n");
}
