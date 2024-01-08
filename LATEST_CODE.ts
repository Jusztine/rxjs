function isItemRemoved(originalObject, filterObject) {
    for (const key in filterObject) {
        if (filterObject.hasOwnProperty(key)) {
            const filterKey = key.replace("accessTags[", "").replace("]", "");
            
            if (originalObject[filterKey]) {
                const originalIds = originalObject[filterKey].map(item => item.id);
                const filterIds = filterObject[key];

                // Check if any selected IDs are not present in the original IDs
                const removedItems = filterIds.filter(id => !originalIds.includes(id));

                if (removedItems.length > 0) {
                    return true; // Items have been removed
                }
            }
        }
    }

    return false; // No items have been removed
}

// Example usage
const newDtass = {
    "location": [
        {
            "id": "SF"
        },
        {
            "id": "FV"
        }
    ],
    "department": [
        {
            "id": "MH"
        }
    ],
    "traffic": [
        {
            "id": "REGULAR"
        }
    ]
};

const filterObject = {
    "accessTags[location]": ["FV"]
};

const removed = isItemRemoved(newDtass, filterObject);

console.log("Items removed:", removed);





import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ContactsRequestParams } from '@ups-crm-store';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  tap,
} from 'rxjs';
import { CdkPortal } from '@angular/cdk/portal';
import {
  ContactId,
  FiltersService,
  PageTitlePortalService,
} from '@ups-mfe-shell-commons';
import * as R from 'ramda';
import { GetQueryParamsUsecase } from '@routing-store';
import { TenantUsecase } from '@ups-users-store';
import { Params } from '@angular/router';
import { AvailableFiltersToFiltersPipe } from '../../pipes';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FocusedFollowUpStore } from 'projects/crm-store/src/lib/data/store/focused-follow-up/focused-follow-up.store';

@UntilDestroy()
@Component({
  selector: 'crm-focused-followup',
  templateUrl: './focused-followup.component.html',
  styleUrl: './focused-followup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FocusedFollowUpStore, AvailableFiltersToFiltersPipe],
})
export class FocusedFollowupComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  constructor(
    protected focusedFollowUpStore: FocusedFollowUpStore,
    protected pageTitlePortal: PageTitlePortalService,
    protected filterService: FiltersService,
    protected getQueryParamsUsecase: GetQueryParamsUsecase,
    protected tenantUsecase: TenantUsecase,
    protected availableFiltersToFiltersPipe: AvailableFiltersToFiltersPipe
  ) {
    // this.assignedTo$.subscribe((data) => {
    //   console.log('cuurent assingto in the aprams', assignedTo);
    // });
  }

  @Input() header = 'Focused Follow Up';

  @ViewChild(CdkPortal) pageTitle: CdkPortal;

  pageTitleInfo = {
    title: 'Focused Follow Up',
    icon: 'adjust',
  };

  contacts$: Observable<any[]> = this.focusedFollowUpStore.data$;

  ngOnDestroy(): void {
    if (this.pageTitle?.isAttached) {
      this.pageTitle.detach();
      this.pageTitlePortal.setPortal(null);
    }
    this.filterService.customFilters$.next(null);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.pageTitlePortal.setPortal(this.pageTitle);
    });
  }

  listOpen$ = new BehaviorSubject(false);

  navigating = new BehaviorSubject<boolean>(false);

  initialLoadup$ = new BehaviorSubject<boolean>(false);

  navigatingWithinList$ = new BehaviorSubject<boolean>(false);

  loadingMoreDebounce$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );

  currentContactId$ = this.getQueryParamsUsecase.queryParams$.pipe(
    map((params) => params?.contactId)
  );

  currentIndex$ = combineLatest([this.currentContactId$, this.contacts$]).pipe(
    map(([contactId, contacts]) =>
      contacts.findIndex((c) => c.contactId === contactId)
    )
  );

  loaded$ = this.focusedFollowUpStore.loaded$;

  error$ = this.focusedFollowUpStore.error$;

  availableFilters$ = this.focusedFollowUpStore.availableFilters$;

  params$ = this.filterService.queryParams$;

  totalIndexCount$ = this.focusedFollowUpStore.getTotalIndex$;

  loading$ = this.focusedFollowUpStore.loading$;

  accessTagsQuery$ = this.focusedFollowUpStore.accessTagsQuery$;

  assignedTo$ = this.focusedFollowUpStore.assignedTo$;

  ngOnInit(): void {
    this.getFocusedFollowUp().pipe(untilDestroyed(this)).subscribe();
  }

  handleError(error: string, urlParams, contacts) {
    if (error === 'Invalid assignedTo was requested') {
      const { assignedTo, contactId, ...params } = urlParams;
      this.loadData(params);
      this.navigateToDefaultPath(contacts, params);
    }
  }

  protected loadData(params: ContactsRequestParams) {
    this.focusedFollowUpStore.getFocusedFollowUpContact$({
      params: { ...params },
    });
  }

  protected navigateToDefaultPath(contacts, urlParams = {}) {
    this.filterService.navigateToPath([], {
      ...urlParams,
      contactId: contacts?.[0]?.contactId,
    });
  }

  protected setupCustomFilters(availableFilters) {
    if (availableFilters) {
      this.filterService.customFilters$.next({
        data: availableFilters,
        transform: this.availableFiltersToFiltersPipe.transform.bind(this),
      });
    }
  }

  handleContactClick(contactId: ContactId, params: Params) {
    if (!!params && !!contactId) {
      const { contactId: _excluded, ...rest } = params;
      this.navigating.next(true);
      this.filterService.navigateToPath([], { contactId, ...rest });
    }
  }

  protected getFocusedFollowUp() {
    return combineLatest([
      this.params$.pipe(distinctUntilChanged()),
      this.availableFilters$?.pipe(distinctUntilChanged()),
      this.accessTagsQuery$.pipe(distinctUntilChanged()),
      this.contacts$,
      this.loading$,
      this.error$,
      this.tenantUsecase.tenantTimezone$,
    ]).pipe(
      debounceTime(250),
      tap(([urlParams, availableFilters, , contacts, , error]) => {
        if (error) {
          this.handleError(error, urlParams, contacts);
        } else {
          this.determineLoadingOrRedirecting(
            urlParams,
            availableFilters,
            contacts
          );
          this.setupCustomFilters(availableFilters);
        }
      }),
      filter(([urlParams, availableFilters, , , loading, error]) => {
        const urlParamLength = Object.keys(urlParams).length;
        return urlParamLength && availableFilters && !loading && !error;
      }),
      map(
        ([
          urlParams,
          avFilters,
          accessTagsQuery,
          contacts,
          ,
          error,
          timezone,
        ]) => {
          const { contactId, ...rParams } = urlParams;

          // Check and remove URL params that aren't "available"
          const paramsNonExist = this.paramsIneligible(rParams, avFilters);
          console.log('paramsNonExist', paramsNonExist);
          console.log('rParams', rParams);

          if (Object.keys(paramsNonExist).length > 0) {
            this.redirectWithoutUnavailableParams(paramsNonExist, rParams);
            return;
          }

          this.loadDataOrWaitWhileUsingList(
            rParams,
            urlParams,
            accessTagsQuery,
            contacts,
            timezone
          );
        }
      )
    );
  }

  protected loadDataOrWaitWhileUsingList(
    params,
    urlParams,
    accessTagsQuery,
    contacts,

    timezone
  ) {
    console.log('accessTagsQuery', accessTagsQuery);

    const { contactId, ...restOfFacets } = urlParams;

    console.log('restOfFacets', restOfFacets);

    const paramsBuilt = this.filterService.filterEmptyParams(
      this.filterService.buildQueryParamsFromResponse(params, false)
    );
    const paramsCheck =
      this.filterService.splitQueryParamsIntoArrays(paramsBuilt);
    const facetsBuilt = this.filterService.filterEmptyParams(
      this.filterService.transformObjectRecursive(
        this.filterService.fromServerToLocal(restOfFacets, timezone)
      )
    );

    const test = this.compareObjects(accessTagsQuery, accessTagsQuery);

    console.log('compare', test);

    //user this
    console.log('paramsCheck', paramsCheck);

    console.log('paramsBuilt', paramsBuilt);

    const paramsMatchFacets = R.equals(paramsCheck, facetsBuilt);
    if (!paramsMatchFacets) {
      this.loadData(paramsBuilt);
    } else if (
      paramsMatchFacets &&
      contacts.length &&
      contactId !== contacts?.[0].contactId
    ) {
      if (!this.navigatingWithinList$.getValue()) {
        this.navigateToDefaultPath(contacts, urlParams);
      } else {
        this.navigatingWithinList$.next(false);
      }
    }
  }

  /**
   * Checks if params in url are available in the response
   */
  protected paramsIneligible(params, availableFilters) {
    const { date, ...urlParams } = params;
    const filteredParams: any = this.filterService.filterEmptyParams(urlParams);
    const paramLength = Object.keys(filteredParams)?.length;
    if (paramLength && availableFilters) {
      const toArray =
        this.filterService.splitQueryParamsIntoArrays(filteredParams);
      return Object.keys(toArray).reduce((acc, curr) => {
        if (!availableFilters[curr]) {
          return { ...acc, [curr]: toArray[curr] };
        }
        const items = toArray[curr];
        items.forEach((item) => {
          if (!availableFilters[curr][item]) {
            if (!acc[curr]) {
              acc[curr] = [];
            }
            acc[curr].push(item);
          }
        });
        return { ...acc };
      }, {});
    }
    return {};
  }

  protected redirectWithoutUnavailableParams(unavailableParams, pathParams) {
    const { date, ...urlParams } = pathParams;
    const params = this.filterService.splitQueryParamsIntoArrays(urlParams);
    const filteredParams = Object.keys(params).reduce((acc, curr) => {
      if (unavailableParams[curr]) {
        return {
          ...acc,
          [curr]: params[curr]
            .filter((i) => !unavailableParams[curr].includes(i))
            .join(','),
        };
      }
      return { ...acc, [curr]: params[curr].join(',') };
    }, {});
    this.filterService.navigateToPath([], {
      ...filteredParams,
    });
    this.loadData(filteredParams);
  }

  /**
   * Left the if/else separate for clarity, hopefully
   * @param urlParams
   * @param availableFilters
   * @param contacts
   * @private
   */
  protected determineLoadingOrRedirecting(
    urlParams,
    availableFilters,
    contacts
  ) {
    if (this.initialLoadup$.getValue()) {
      return;
    }
    const paramLength = Object.keys(urlParams)?.length;
    if (!paramLength && !availableFilters) {
      // There are no params so load up initial data
      this.loadData({});
    } else if (!paramLength && availableFilters && contacts.length) {
      // We have data, but haven't redirected yet.
      this.navigateToDefaultPath(contacts);
      this.initialLoadup$.next(true);
    } else if (paramLength && !availableFilters) {
      // Landed on the page with parameters already
      const { contactId, ...rest } = urlParams;
      const sendParams = this.filterService.filterEmptyParams(
        this.filterService.buildQueryParamsFromResponse(rest, false)
      );
      if (contactId) {
        this.navigatingWithinList$.next(true);
      }
      this.loadData(sendParams);
    } else if (
      paramLength &&
      !urlParams?.contactId &&
      availableFilters &&
      contacts.length
    ) {
      // There is data, but no contact id in the params.
      this.navigateToDefaultPath(contacts, urlParams);
      this.initialLoadup$.next(true);
    }
  }

  compareObjects(obj1, obj2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        return false;
      }
    }

    return true;
  }
}






response 
 "data": {
        "accessTagsQuery": {
            "location": [
                {
                    "id": "SF"
                },
                {
                    "id": "FV"
                }
            ],
            "department": [
                {
                    "id": "MH"
                }
            ],
            "traffic": [
                {
                    "id": "REGULAR"
                }
            ]
        },
        "assignedTo": [
            "62718b96a8360f3537be2d4a"
        ],
        "availableFilters": {
            "accessTags[location]": {
                "SF": "Santa Fe Springs",
                "FV": "Fountain Valley"
            },
            "accessTags[department]": {
                "MH": "Motorhomes"
            },
            "accessTags[traffic]": {
                "REGULAR": "Regular"
            },
            "assignedTo": {
                "62718b96107ac7d93a0a2490": "Aguilar Floyd",
                "62718b965cae248e8a64c7d2": "Atkinson Williamson",
                "62718b961ebab90694979e9b": "Avila Joseph",
                "62718b9657788baa99c319ce": "Baldwin Harmon",
                "62718b96df381a017e765d3d": "Barrett Mack",
                "62718b962b59d89023d9894d": "Bauer Stevens",
                "62718b96ec922f493f9e8663": "Betty Riggs",
                "617e092419b6eaaf40ffe0d3": "Billy Jankowitz",
                "62718b96a8360f3537be2d4a": "Cantrell Emerson",
                "62718b9617fab70572fcd363": "Carney Moon",
                "62718b96acf4ead954c2f054": "Christina Ashley",
                "62718b965e9b7411d9f78942": "Claire Patel",
                "62718b96e59ff7c6fa9ebd2f": "Cooper Castillo",
                "62718b966b59d6464598e11e": "Delia Mcdowell",
                "62718b962a3








//respomse for accesstags 
 "data": {
        "accessTagsQuery": {
            "location": [
                {
                    "id": "SF"
                }
            ],
            "department": [
                {
                    "id": "MH"
                }
            ],
            "traffic": [
                {
                    "id": "REGULAR"
                }
            ]
        },
        "assignedTo": [
            "62718b968b8088af72d3dd52",
            "62718b9655991306505c60d7",
            "62718b96f5b573d6fcc7acd2",
            "62718b96df381a017e765d3d",
            "62718b9606c42b327491231f",
            "62718b96b8952e25b5e65a47",
            "62718b965



