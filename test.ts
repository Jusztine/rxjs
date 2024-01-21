import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[upsLibValidatePhoneFormat]',
})
export class ValidatePhoneFormatDirective {
  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event'])
  onInput(event: any): void {
    const inputValue: string = event.target.value.replace(/\D/g, ''); // Remove non-numeric characters
    const formattedValue: string = this.formatPhoneNumber(inputValue);
    event.target.value = formattedValue;
  }

  private formatPhoneNumber(value: string): string {
    const areaCode = value.substring(0, 3);
    const firstPart = value.substring(3, 6);
    const secondPart = value.substring(6, 10);

    let formattedValue = '';

    if (areaCode) {
      formattedValue += `(${areaCode}`;
    }

    if (firstPart) {
      formattedValue += `) ${firstPart}`;
    }

    if (secondPart) {
      formattedValue += `-${secondPart}`;
    }

    return formattedValue;
  }
}
