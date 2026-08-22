#include "wokwi-api.h"
#include <stdio.h>
#include <stdlib.h>

void chip_init() {
  pin_init("POS", OUTPUT_HIGH);
  pin_init("NEG", OUTPUT_LOW);

  printf("[LiPo] Battery Cell 3.7V 350mAh Connected!\n");
}
