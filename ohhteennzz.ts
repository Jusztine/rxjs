import { Inject, Injectable } from '@angular/core';
import { ComponentStore, tapResponse } from '@ngrx/component-store';
import {
  RecentCall,
  RecentCallParams,
  RecentCallResponse,
  SmsDatasourceInterface,
} from '../../../models';
import { SMS_DATASOURCE } from '../../../injection-tokens';
import {
  EMPTY,
  Observable,
  catchError,
  concatMap,
  filter,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';

export interface RecentCallState {
  recentCalls: {
    loaded: boolean;
    loading: boolean;
    calls: RecentCall[];
    currentPage: number;
    maxPage: number;
    loadingMore: boolean;
  };
}

const recentCallDefaultState: RecentCallState = {
  recentCalls: {
    loaded: false,
    loading: false,
    calls: null,
    currentPage: null,
    maxPage: null,
    loadingMore: false,
  },
};

@Injectable()
export class RecentCallStore extends ComponentStore<RecentCallState> {
  constructor(
    @Inject(SMS_DATASOURCE) private smsDatasource: SmsDatasourceInterface
  ) {
    super(recentCallDefaultState);
  }

  readonly recentCallLoadState$ = this.select(({ recentCalls }) => ({
    loading: recentCalls.loading,
    loaded: recentCalls.loaded,
  }));

  readonly recentCalls$ = this.select(({ recentCalls }) => recentCalls.calls);

  readonly currentPage$ = this.select(({ recentCalls }) => ({
    currentPage: recentCalls.currentPage,
    maxPage: recentCalls.maxPage,
  }));

  readonly recentCallsLoadMore$ = this.select(
    ({ recentCalls }) => recentCalls.loadingMore
  );

  readonly recentCallsHasMoreToLoad$ = this.select(
    ({ recentCalls }) => recentCalls.currentPage < recentCalls.maxPage
  );

  readonly setRecentCallsLoadingMore = this.updater((state) => ({
    ...state,
    recentCalls: {
      ...state.recentCalls,
      loadingMore: true,
    },
  }));

  readonly setRecentCallsLoading = this.updater(
    (state, data: { loading: boolean; error?: string }) => ({
      ...state,
      recentCalls: {
        ...state.recentCalls,
        loaded: false,
        loading: data.loading,
      },
    })
  );
  readonly getRecentCallsSuccess = this.updater(
    (state, calls: RecentCallResponse) => ({
      ...state,
      recentCalls: {
        ...state.recentCalls,
        loaded: true,
        loading: false,
        calls: [...calls.data],
        maxPage: calls.maxPage,
        currentPage: calls.currentPage,
      },
    })
  );

  readonly getRecentCallsLoadMoreSuccess = this.updater(
    (state, calls: RecentCallResponse) => ({
      ...state,
      recentCalls: {
        ...state.recentCalls,
        loadingMore: false,
        calls: [...calls.data],
        currentPage: calls.currentPage,
      },
    })
  );

  // getRecentCalls = this.effect((params$: Observable<{
  //   params: RecentCallParams
  // }>) => {
  //   return params$.pipe(
  //     switchMap((assignedTo) => {
  //       this.setRecentCallsLoading({ loading: true });

  //       return this.smsDatasource.getRecentCalls(assignedTo).pipe(
  //         tapResponse(
  //           (response) => {
  //             this.getRecentCallsSuccess({
  //               currentPage: response.currentPage,
  //               data: response.data,
  //               maxPage: response.maxPage,
  //             });
  //           },
  //           (error) => {
  //             this.setRecentCallsLoading({
  //               loading: false,
  //               error: 'Could not load messages at this time.',
  //             });
  //           }
  //         )
  //       );
  //     })
  //   );
  // });

  getRecentCalls = this.effect(
    (
      params$: Observable<{
        params: RecentCallParams;
      }>
    ) => {
      return params$.pipe(
        concatMap((data: { params: RecentCallParams }) => {
          this.setRecentCallsLoading({ loading: true });

          return this.smsDatasource.getRecentCalls(data.params).pipe(
            tap((response) => {
              this.getRecentCallsSuccess({
                currentPage: response.currentPage,
                data: response.data,
                maxPage: response.maxPage,
              });
              (error) => {
                this.setRecentCallsLoading({
                  loading: false,
                  error: 'Could not load recent calls at this time.',
                });
              };
            })
          );
        })
      );
    }
  );

  readonly loadMoreRecentCalls = this.effect((page$: Observable<void>) => {
    return page$.pipe(
      withLatestFrom(this.currentPage$),
      filter(
        ([, currentPage]) => currentPage.currentPage + 1 <= currentPage.maxPage
      ),
      concatMap(([, currentPage]) => {
        const page = currentPage.currentPage + 1;

        const params = { page, assignedTo: '617e092419b6eaaf40ffe0d1' };
        this.setRecentCallsLoadingMore();
        return this.smsDatasource.getRecentCalls(params).pipe(
          tapResponse(
            (response) => {
              console.log(response);

              this.getRecentCallsLoadMoreSuccess(response);
            },
            (error) => {
              console.log(error);
            }
          )
        );
      }),
      catchError(() => EMPTY)
    );
  });
}


import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  Signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ContactContextComponent,
  DialogHeaderComponent,
  DialogMinimizedComponent,
  PhoneEmptyMessageComponent,
  RecentCallItemComponent,
} from '../../components';
import { MatIconModule } from '@angular/material/icon';
import {
  PhoneAudios,
  PhoneNumberAssignment,
  PhoneStatuses,
  RecentCall,
} from '../../models';
import { MatTabsModule } from '@angular/material/tabs';
import { toSignal } from '@angular/core/rxjs-interop';
import { SMS_DATASOURCE } from '../../injection-tokens';
import {
  CallStatus,
  PhoneStore,
  RecentCallStore,
  SmsDatasource,
} from '../../data';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';

const phoneUtility = PhoneNumberUtil.getInstance();

export interface PhoneDialInterface {
  number: string;
  assignedTo: string;
}

@Component({
  selector: 'ups-phone-recent-calls-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogHeaderComponent,
    DialogMinimizedComponent,
    MatIconModule,
    ContactContextComponent,
    MatTabsModule,
    RecentCallItemComponent,
    PhoneEmptyMessageComponent,
  ],
  providers: [{ provide: SMS_DATASOURCE, useClass: SmsDatasource }],
  templateUrl: './recent-calls-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentCallsDialogComponent implements OnInit {
  private recentCall = inject(RecentCallStore);

  private phoneStore = inject(PhoneStore);

  callStatus: Signal<CallStatus> = toSignal(this.phoneStore.callStatus$);

  phoneStatuses = PhoneStatuses;

  recentCallLoadState: Signal<{ loading: boolean; loaded: boolean }> = toSignal(
    this.recentCall.recentCallLoadState$
  );

  recentCalls: Signal<RecentCall[]> = toSignal(this.recentCall?.recentCalls$);

  recentCallsLoadingMore$ = this.recentCall.recentCallsLoadMore$;

  recentCallsHasMoreToLoad$ = this.recentCall.recentCallsHasMoreToLoad$;

  callTime = signal(0);

  @Input() phoneNumberAssignment: PhoneNumberAssignment;

  @Output() resizeEvent = new EventEmitter<void>();

  private loadedEffect = effect(() => {
    if (
      this.recentCallLoadState().loaded &&
      !this.recentCallLoadState().loading
    ) {
      this.resizeEvent.emit();
    }
  });

  private timerOnCallsEffect = effect(
    (cleanUp) => {
      let timer;
      if (this.callStatus()?.status === this.phoneStatuses.active) {
        timer = setInterval(() => {
          this.callTime.set(this.callTime() + 1);
        }, 1000);

        cleanUp(() => {
          clearInterval(timer);
          this.callTime.set(0);
        });
      } else if (timer) {
        clearInterval(timer);
        this.callTime.set(0);
      }
    },
    { allowSignalWrites: true }
  );

  muted: Signal<boolean> = computed(() => {
    return this.callStatus()?.audio === PhoneAudios.mute;
  });

  onCallClick($event: PhoneDialInterface) {
    try {
      const phoneParsed = phoneUtility.parse($event.number, 'US');
      const to = phoneUtility.format(phoneParsed, PhoneNumberFormat.E164);
      this.phoneStore.lookupAndMakeCall({
        phoneNumber: to,
        assignedTo: $event.assignedTo,
      });
    } catch (error) {
      console.log(error);
    }
  }

  hangUpCall($event: boolean) {
    this.phoneStore.hangUpCall($event);
  }

  muteCall() {
    const mute = !this.muted();
    this.phoneStore.muteCall(mute);
  }

  requestMore() {
    console.log('this calls');

    this.recentCall.loadMoreRecentCalls();
  }

  ngOnInit() {
    const assignedTo = this.phoneNumberAssignment?.assignedTo;

    this.recentCall.getRecentCalls({ params: { assignedTo } });
  }
}


  <mat-tab-group class="p-3" style="height: 510px; overflow-y: auto">
    <cdk-virtual-scroll-viewport [itemSize]="100">
      <mat-tab label="All">
        @for(recentCall of recentCalls; track recentCall.callSid) {
        <div class="flex p-4 pt-0 items-center">
          <div class="mr-4">
            <mat-icon
              [ngClass]="{
                'text-red-500': recentCall.direction === 'missed',
                'text-blue-500': recentCall.direction === 'incoming',
                'text-green-500': recentCall.direction === 'outgoing'
              }"
            >
              <ng-container
                *ngIf="recentCall.direction === 'missed'; else otherIcons"
                >phone_missed</ng-container
              >
              <ng-template #otherIcons>
                <ng-container
                  *ngIf="recentCall.direction === 'incoming'; else outgoingIcon"
                  >phone_callback</ng-container
                >
                <ng-template #outgoingIcon>
                  <ng-container
                    *ngIf="
                      recentCall.direction === 'outgoing';
                      else defaultIcon
                    "
                    >phone_forwarded</ng-container
                  >
                </ng-template>
              </ng-template>
            </mat-icon>
          </div>

          <div class="flex-grow mt-5">
            <div class="flex items-center justify-between">
              <span>
                <button
                  [disabled]="callOngoing"
                  class="font-bold cursor-pointer"
                  (click)="
                    onCallClick(recentCall.label, recentCall.assignedTo);
                    updateSelectedCallSid(recentCall.callSid)
                  "
                >
                  {{ recentCall.label }}
                </button>
                <p class="text-sm text-gray-500">mobile</p>
              </span>

              <span class="text-right ml-4">
                <p class="font-bold">
                  {{ recentCall.calledAt | date : "shortDate" }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ recentCall.calledAt | date : "shortTime" }}
                </p>
              </span>
            </div>
          </div>

          <div class="ml-4">
            <mat-icon class="text-blue-500">info</mat-icon>
          </div>
        </div>
        <div class="flex-grow border-b border-gray-400"></div>
        <div *ngIf="hasMoreToLoad">
          <div
            inViewport
            [inViewportOptions]="{ threshold: [0] }"
            (inViewportAction)="loadMore($event)"
          >
            <mat-spinner [diameter]="50" *ngIf="loadingMore"></mat-spinner>
          </div>
        </div>

        <div *ngIf="selectedCallSid === recentCall.callSid">
          <ups-phone-recent-calls-dialpad
            [callStatus]="callStatus.status"
            [muted]="muted"
            [timeOnCall]="timeOnCall"
            (mute)="mute($event)"
            (hangUp)="hangUp($event)"
          ></ups-phone-recent-calls-dialpad>
        </div>

        }
      </mat-tab>
    </cdk-virtual-scroll-viewport>

    <mat-tab label="Missed">
      <div class="flex flex-col items-center">
        <ng-container
          *ngIf="getMissedCalls().length === 0; else missedCallsBlock"
        >
          <ups-phone-empty-message
            [icon]="'phone_missed'"
            [message]="'No Missed Calls'"
            [iconColor]="'text-red-500'"
          >
          </ups-phone-empty-message>
        </ng-container>
        <ng-template #missedCallsBlock>
          <div class="flex flex-col items-center">
            <div
              *ngFor="let recentCall of getMissedCalls(); trackBy: trackByFn"
              class="call-block"
            >
              <div class="flex p-4 pt-0 items-center">
                <div class="mr-4">
                  <mat-icon class="text-red-500">phone_missed</mat-icon>
                </div>
                <div class="flex-grow mt-5">
                  <div class="flex items-center justify-between">
                    <span>
                      <button
                        [disabled]="callOngoing"
                        class="font-bold cursor-pointer text-red-500"
                        (click)="
                          onCallClick(recentCall.label, recentCall.assignedTo);
                          updateSelectedCallSid(recentCall.callSid)
                        "
                      >
                        {{ recentCall.label }}
                      </button>
                      <p class="text-sm text-gray-500">mobile</p>
                    </span>
                    <span class="text-right ml-4">
                      <p class="font-bold">
                        {{ recentCall.calledAt | date : "shortDate" }}
                      </p>
                      <p class="text-sm text-gray-500">
                        {{ recentCall.calledAt | date : "shortTime" }}
                      </p>
                    </span>
                  </div>
                </div>
                <div class="ml-4">
                  <mat-icon class="text-blue-500">info</mat-icon>
                </div>
              </div>
              <div class="border-b border-gray-400"></div>

              <div *ngIf="selectedCallSid === recentCall.callSid">
                <ups-phone-recent-calls-dialpad
                  [callStatus]="callStatus.status"
                  [muted]="muted"
                  [timeOnCall]="timeOnCall"
                  (mute)="mute($event)"
                  (hangUp)="hangUp($event)"
                ></ups-phone-recent-calls-dialpad>
              </div>
            </div>
          </div>
        </ng-template>
      </div>
    </mat-tab>
  </mat-tab-group>



  getRecentCalls(
    recentCallParams: RecentCallParams
  ): Observable<RecentCallResponse> {
    const params: Params = {
      ...this.filterParams(recentCallParams),
    };

    const url = `${this.env.phoneApp}/recent-calls`;

    return this.http
      .get(url, {
        params,
        withCredentials: true,
      })
      .pipe(
        map(
          (response: Record<string, any>) => response.data as RecentCallResponse
        ),
        catchError(() =>
          throwError(() => 'Could not load recent calls at this time')
        )
      );
  }


  private filterParams = (params) => {
    return Object.keys(params).reduce((acc, curr) => {
      if (params[curr]) {
        if (
          typeof params[curr] === 'string' ||
          typeof params[curr] === 'number'
        ) {
          acc[curr] = params[curr];
        } else if (Array.isArray(params[curr])) {
          acc[curr] = params[curr]?.join(',');
        } else {
          Object.keys(params[curr]).forEach((subKey) => {
            if (params[curr][subKey]) {
              acc[`${curr}[${subKey}]`] = params[curr][subKey].join(',');
            }
          });
        }
      }
      return acc;
    }, {});
  };


export interface RecentCallParams {
  page?: number;
  assignedTo?: string;
}


  getRecentCalls(
    recentCallsParams: RecentCallParams
  ): Observable<RecentCallResponse>;
