import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

import { UpEngagementHistoryModel, UpHistoryModel } from '@ups-lib';
import { TypeaheadContactNameUsecase } from '@ups-search-store';
import {
  Observable,
  Subject,
  concatMap,
  debounceTime,
  map,
  of,
  startWith,
  takeUntil,
} from 'rxjs';

@Component({
  selector: 'up-engagement-traffic-history',
  templateUrl: './engagement-traffic-history.component.html',
  styleUrls: ['./engagement-traffic-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngagementTrafficHistoryComponent
  implements OnChanges, AfterViewInit
{
  constructor(
    private typeAheadContact: TypeaheadContactNameUsecase,
    private cdr: ChangeDetectorRef
  ) {}

  @Input() dataSource!: UpEngagementHistoryModel[];

  @Input() skeleton: boolean = false;

  @Input() crmEnabled = false;

  @ViewChild('contactName') contactName: ElementRef;

  public stateInputChange$: Subject<string> = new Subject<string>();

  destroyed$ = new Subject<boolean>();

  filteredContactNameOps: {
    label: string;
    value: string;
    contactId: string;
  }[];

  series = [
    {
      name: 'Information Gathered Score',
      value: 74,
      label: '20%',
    },
  ];
  colorScheme = {
    domain: ['#91b9ea'],
  };

  displayedColumns: string[] = [
    'salesperson',
    'trafficType',
    'contactName',
    'notes',
    'time',
    'duration',
  ];

  source: string = 'EngagementLog';
  selectedContactId: string;
  selectedContactIds: string[] = [];
  selectedContactName: string;

  contactValue: string;

  ngAfterViewInit() {
    this.stateInputChange$
      .pipe(
        startWith(''),
        debounceTime(250),
        concatMap((value) => {
          if (value) {
            this.resetSelectedContactId();
          }

          if (value && value.length >= 2) {
            return this.filterTypeAhead(value);
          }

          return of(null);
        })
      )
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.filteredContactNameOps = res;
        this.cdr.detectChanges();
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.crmEnabled?.firstChange && !changes.crmEnabled?.currentValue) {
      this.displayedColumns = [
        ...this.displayedColumns.filter((i) => i !== 'notes'),
      ];
    }
  }

  isGroup = (_index, item): boolean => {
    return item.isGroupBy;
  };

  trackById = (index, item) => {
    return item.id || index;
  };

  // onInputFocus(value: string) {
  //   if (value.trim() === '') {
  //     this.resetSelectedContactId();
  //   }
  // }

  @Output() submitContactPerson = new EventEmitter<{
    data: {
      assignedTo: string;
      firstName: string;
      lastName?: string;
      source: string;
      claimId: string;
    };
    upTapeId: string;
  }>();

  @Output() submitContactFromTheList = new EventEmitter<{
    data: {
      touchId: string;
      contactId: string;
      claimId: string;
      firstName: string;
      lastName?: string;
    };
    upTapeId: string;
  }>();

  @Output() submitUpdateNotes = new EventEmitter<{
    payload: {
      notes: string;
      contactId: string;
    };
    claimId: string;
  }>();

  @Output() submitUpdateQualification = new EventEmitter<{
    payload: {
      contactId: string;
      qualification: string;
      toggleValue: boolean;
    };
    source: string;
    claimId: string;
  }>();

  filterTypeAhead(
    val: string
  ): Observable<{ label: string; value: string; contactId: string }[]> {
    return this.typeAheadContact.executeOnlyTheQuery(val).pipe(
      map((response) =>
        response.map((i) => ({
          label: i.highlight || i.fullName,
          value: i.fullName,
          contactId: i.contactId,
        }))
      )
    );
  }

  resetSelectedContactId() {
    // this.selectedContactIds[index] = null;
    this.selectedContactId = null;
  }

  autoCompleteSelected($event: MatAutocompleteSelectedEvent, index: number) {
    const selectedOption = $event.option.value;
    const contactId = selectedOption.contactId;
    this.selectedContactId = contactId;
    this.selectedContactName = selectedOption.value;

    console.log('select name', this.selectedContactName);

    this.selectedContactIds[index] = this.selectedContactId;
  }

  displayOptionValue(option: any): string {
    return option ? option.value : '';
  }

  handleContact(contactName: string, element: UpHistoryModel, index: number) {
    const { assignedTo, claimId, upTapeId, touchId } = element;

    console.log(this.contactValue);

    if (this.selectedContactName !== contactName) {
      this.resetSelectedContactId();
    }

    const names = contactName.trim().split(' ');
    const data: {
      assignedTo: string;
      contactId: string;
      touchId: string;
      upTapeId: string;
      source: string;
      claimId: string;
      lastName?: string;
      firstName: string;
    } = {
      firstName:
        names.length <= 1
          ? names.at(-1)
          : names.slice(0, names.length - 1).join(' '),
      ...(names.length > 1 && { lastName: names.at(-1) }),
      assignedTo,
      source: this.source,
      claimId,
      touchId,
      upTapeId,
      contactId: this.selectedContactIds[index],
    };

    console.log(this.selectedContactIds);

    if (this.selectedContactIds[index]) {
      data.touchId = touchId;

      console.log('data passed', data);

      // this.submitContactFromTheList.emit({ data, upTapeId });
    } else {
      console.log('new id');
      console.log(data);

      // this.submitContactPerson.emit({ data, upTapeId });
    }
  }

  handleNotes(notes: string, contactId: string, claimId: string) {
    this.submitUpdateNotes.emit({
      payload: {
        notes,
        contactId,
      },
      claimId,
    });
  }

  handleToggleQualification(
    { rating, toggleValue },
    claimId: string,
    contactId: string
  ) {
    if (!rating) {
      return;
    }

    const qualification = rating === 'Hot' ? 'Hot' : 'Cold';

    const data = {
      claimId,
      payload: {
        qualification,
        contactId,
        toggleValue,
      },
      source: this.source,
    };

    this.submitUpdateQualification.emit(data);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
