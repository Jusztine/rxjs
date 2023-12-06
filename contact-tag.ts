import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import {
  ContactTagName,
  TypeaheadContactTagNameItem,
  TypeaheadContactTagNameUseCase,
  UserPreferencesResponse,
  LoadUsersPreferencesUseCase,
} from '@ups-crm-store';
import { FiltersService } from '@ups-mfe-shell-commons';
import {
  concatMap,
  debounceTime,
  filter,
  map,
  Observable,
  of,
  startWith,
  take,
  withLatestFrom,
} from 'rxjs';

@Component({
  selector: 'crm-contact-tag-label',
  templateUrl: './contact-tag-label.component.html',
  styleUrls: ['./contact-tag-label.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactTagLabelComponent {
  @Input() skeleton: boolean;

  @Input() contactTags: ContactTagName[];

  @Input() typeAheadTags: TypeaheadContactTagNameItem[] = [];

  @Output() addContactTagNameSubmit = new EventEmitter<{
    tagName: ContactTagName;
  }>();

  @Output() removeContactTagNameSubmit = new EventEmitter<{
    tagName: ContactTagName;
  }>();

  @Output() addContactTagColorSubmit = new EventEmitter<{
    tagName: ContactTagName;
    color: string;
  }>();

  searchControl = new FormControl();

  filteredOptions$: Observable<{ label: string; value: string }[]>;
  userPreferences: UserPreferencesResponse;

  constructor(
    private typeAheadSearchTag: TypeaheadContactTagNameUseCase,
    private filterService: FiltersService,
    private loadUsersPref: LoadUsersPreferencesUseCase
  ) {
    const tags = this.filterService.accessTags$.pipe(filter((t) => !!t));

    this.filteredOptions$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(250),
      withLatestFrom(tags),
      concatMap(([val]) => {
        if (val && val.length >= 2) {
          return this.filterTypeaheadTag(val);
        }
        return of(null);
      })
    );

    // this.loadUsersPref.getUserPreferences().subscribe((data) => {
    //   this.userPreferences = data;
    //   this.tagColors = this.userPreferences.tagColors || {};
    // });
    this.loadUsersPref
      .getUserPreferences()
      .pipe(take(1))
      .subscribe((data) => {
        this.userPreferences = data;
        this.tagColors = this.userPreferences.tagColors || {};
      });
  }

  colorOptions = [
    { label: 'red', value: '#ff0000' },
    { label: 'orange', value: '#FFA500' },
    { label: 'yellow', value: '#FFFF00' },
    { label: 'green', value: '#00FF00' },
    { label: 'blue', value: '#0000FF' },
    { label: 'purple', value: '#800080' },
  ];

  tagColors: { [tag: string]: string } = {};

  setSelectedOption(tag: string, option: string) {
    this.tagColors[tag] = option;
    this.addContactTagColorSubmit.emit({ tagName: tag, color: option });
  }

  addContactTag() {
    const value = this.searchControl.value;
    this.addContactTagNameSubmit.emit({ tagName: value });
    this.searchControl.setValue(null);
  }

  removeContactTag(contactTagName: ContactTagName) {
    this.removeContactTagNameSubmit.emit({ tagName: contactTagName });
  }

  autoCompletedTagSelected(event: MatAutocompleteSelectedEvent) {
    const q = event.option.value;
    this.searchControl.setValue(q);
  }

  filterTypeaheadTag(
    val: string
  ): Observable<{ label: string; value: string }[]> {
    return this.typeAheadSearchTag.execute(val).pipe(
      map((resp) =>
        resp.map((i) => ({
          label: i.highlight || i.tag,
          value: i.tag,
        }))
      )
    );
  }
}
