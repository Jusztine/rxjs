  evtSource!: EventSource;
  currentUptapeId!: string;

  sliderChange(data: any): void {
    this.onUptapeUsecase.execute(data);
  }

  localStorageKey = 'dashboard-done-collapse-setting';

  writeLocalStorageDoneCollapseSetting(setting: boolean) {
    localStorage.setItem(this.localStorageKey, `${setting}`);
  }

  readLocalStorageDoneCollapseSetting(): boolean {
    const item = localStorage.getItem(this.localStorageKey);
    return item !== null ? item === 'true' : false;
  }

  isDoneContainerCollapsed$ = new BehaviorSubject(
    this.readLocalStorageDoneCollapseSetting()
  );

  ngOnInit(): void {
    this.sliderData$ = this.loadedById$.pipe(
      filter((result) => !!result),
      map((result: historyResponse) => ({
        ...result.events.reduce(
          (acc, val) => {
            acc['name'].push(val.name);
            acc['time'].push(val.time);
            return acc;
          },
          { name: [], time: [] }
        ),
        tickData: result.data,
        totalTicks: result.events.length - 1,
        tickerValue: result.events.length - 1,
      }))
    );
  }

  ngOnDestroy(): void {
    if (this.evtSource) {
      this.evtSource.close();
    }
    if (this.pageTitle?.isAttached) {
      this.pageTitle.detach();
      this.pageTitlePortal.setPortal(null);
    }
  }

  sliderData$: Observable<{
    time: string[];
    name: string[];
    tickData: object[];
    totalTicks: number;
    tickerValue: number;
  }>;

  validAccessTags$ = this.tenant.accessTags$.pipe(filter((x) => !!x));

  auth$ = this.authUsecase.auth$;

  skipReasons$ = this.uptapeSettingsUsecase.uptapeSettingsSkipReasons$;

  progression$ = this.uptapeSettingsUsecase.uptapeSettingsProgression$;

  settings$ = this.uptapeSettingsUsecase.uptapeSettings$;

  nextUpOnTape$: BehaviorSubject<Up> = new BehaviorSubject(null);

  filteredSalesUsers$ = this.getUsersUsecase.filteredSales$;

  currentUptapeEntity$ = this.getUptapeUsecase.currentUptapeEntity$.pipe(
    filter((x) => !!x)
  );

  isDraggingToUps: boolean = false;
  isDraggingToWithCustomer: boolean = false;
  isDraggingToDone: boolean = false;

 

  currentUptape$ = combineLatest([
    this.validAccessTags$,
    this.currentUptapeEntity$,
    this.tokenUsecase.execute(),
  ]).pipe(
    tap(async ([_, upTape, token]) => {
      if (upTape) {
        if (this.currentUptapeId !== upTape.id && this.evtSource) {
          this.evtSource.close();
          delete this.evtSource;
        }

        const url = `${this.env.uptapeApp}/uptape/${upTape.id}/events`;
        const sseToken = token;
        const maxAttempts = 6;

        try {
          if (!this.evtSource) {
            // this.evtSource = await this.fetchDataWithFibonacciBackoff(
            //   url,
            //   sseToken
            // );

            this.evtSource = await this.connectSSE(url, token);

            this.evtSource.onopen = function () {
              console.log('Connected to uptape events.');
            };

            this.evtSource.addEventListener('update', (event) => {
              const data = JSON.parse(event.data);
              if (data.upTape) this.onUptapeUsecase.execute(data.upTape);
              if (data.stateChangeMessage?.title)
                this.showSnackbarUsecase.execute(
                  data.stateChangeMessage.title,
                  'X',
                  'success'
                );
            });

            this.evtSource.onerror = function () {
              console.log('EventSource failed.');
            };
          }
        } catch (error) {
          console.log('Failed to connect to SSE:', error);
        }

        // if (!this.evtSource) {
        //   this.evtSource = new EventSource(
        //     `${this.env.uptapeApp}/uptape/${upTape.id}/events?access_token=${token}`
        //   );
        //   this.evtSource.onopen = function () {
        //     console.log('Connected to uptape events.');
        //   };

        //   this.evtSource.addEventListener('update', (event) => {
        //     const data = JSON.parse(event.data);
        //     if (data.upTape) this.onUptapeUsecase.execute(data.upTape);
        //     if (data.stateChangeMessage?.title)
        //       this.showSnackbarUsecase.execute(
        //         data.stateChangeMessage.title,
        //         'X',
        //         'success'
        //       );
        //   });

        //   this.evtSource.onerror = function () {
        //     console.log('EventSource failed.');
        //   };
        // }

        this.currentUptapeId = upTape.id;
      }
    }),
    map(([validTags, upTape, token]) => {
      return {
        ...upTape,
        attributes: {
          ...upTape.attributes,
          accessTags:
            upTape.attributes.accessTags &&
            AccessTagsUtils.toFullAccessTags(
              validTags as any,
              upTape.attributes.accessTags
            ),
          inboundEmail: upTape.attributes.inboundEmail,
          inboundQueue: upTape.attributes.inboundQueue,
        },
      };
    })
  );

  currentUptapeUpIds$ = this.getUptapeUsecase.currentUptapeUpIds$;

  loadedById$ = this.getUptapeUsecase.loadedById$.pipe(
    switchMap((id) => {
      if (id) {
        this.pageTitlePortal.setPortal(this.pageTitle);
        return this.getUptapeHistoryUsecase.execute(id);
      }
      return of(null);
    }),
    share()
  );

  idOfLoadedUp$ = this.getUptapeUsecase.loadedById$.pipe(map((id) => !!id));

  currentUpsOnTape$ = this.upsUsecase.currentUpsOnTape$.pipe(
    tap((ups) => {
      if (ups && ups.length > 0) {
        this.nextUpOnTape$.next(ups[0]);
      } else {
        this.nextUpOnTape$.next(null);
      }
    })
  );

  currentUpsOnTapeCount$ = this.currentUpsOnTape$.pipe(
    map((ups) => {
      const length = ups ? ups.length : 0;
      return `${length} ${
        length === 1 ? 'Salesperson is' : 'Salespeople are'
      } available`;
    })
  );

  currentUpsWithCustomer$ = this.upsUsecase.currentUpsWithCustomer$;

  currentUpsNotCompleted$ = this.upsUsecase.currentUpsNotCompleted$;

  currentUpsCount$ = this.upsUsecase.currentUpsCount$;

  currentUpsCompleted$ = this.upsUsecase.currentUpsCompleted$;

  currentUpsCompletedCount$ = this.currentUpsCompleted$.pipe(
    map((ups) => {
      const length = ups ? ups.length : 0;
      return `${length} ${length === 1 ? 'Up has' : 'Ups have'} been completed`;
    })
  );

  authRoles$: Observable<string[]> = this.auth$.pipe(
    map((auth) => auth && auth.attributes.roles)
  );

  isSales$: Observable<boolean> = this.authRoles$.pipe(
    map((roles) => roles && roles.includes('sales'))
  );

  canManage$: Observable<boolean> = this.authRoles$.pipe(
    filter((authRoles) => !!authRoles),
    map(
      (roles) =>
        !!['admin', 'manager', 'down_desk'].some((role) => roles.includes(role))
    )
  );

  canReset$: Observable<boolean> = this.authRoles$.pipe(
    filter((authRoles) => !!authRoles),
    map((roles) => !!['admin', 'manager'].some((role) => roles.includes(role)))
  );

  mappedUsers$ = this.filteredSalesUsers$.pipe(
    map((users) =>
      users.map((user) => ({
        value: user.id,
        label: `${user.attributes.firstName} ${user.attributes.lastName}`,
      }))
    )
  );

  currentSalesId$ = combineLatest([this.auth$, this.filteredSalesUsers$]).pipe(
    map(
      ([auth, salesUsers]) =>
        salesUsers &&
        salesUsers
          .filter(
            (salesUser) =>
              salesUser?.attributes?.username === auth?.attributes?.username
          )
          .map((user) => user.id.toString())
          .pop()
    )
  );

  canTakeNextUp$: Observable<boolean> = combineLatest([
    this.nextUpOnTape$,
    this.canManage$,
    this.currentSalesId$,
  ]).pipe(
    map(([up, canManage, currentId]) =>
      !canManage
        ? !!currentId && up?.attributes?.assignedTo === currentId
        : true
    )
  );

  isDraggable$ = combineLatest([this.canReset$, this.currentSalesId$]).pipe(
    map(([canReset, currentSalesId]) => ({ canReset, currentSalesId }))
  );

  filteredUserOptions$ = combineLatest([
    this.filteredSalesUsers$,
    this.isSales$,
    this.auth$,
  ]).pipe(
    map(([salesUsers, isSales, auth]) => {
      return (
        salesUsers &&
        salesUsers
          .filter((salesUser) =>
            isSales
              ? salesUser?.attributes?.username === auth?.attributes?.username
              : salesUser
          )
          .map((user) => ({
            value: user.id,
            label: `${user.attributes.firstName} ${user.attributes.lastName}`,
          }))
      );
    })
  );

  selectableUsers$ = combineLatest([
    this.filteredUserOptions$,
    this.currentUpsNotCompleted$,
  ]).pipe(
    map(([salesUsers, currentUpsNotCompleted]) => {
      return currentUpsNotCompleted
        ? salesUsers.filter((user) =>
            currentUpsNotCompleted.every(
              (up) => up.attributes.assignedTo !== user.value
            )
          )
        : salesUsers;
    })
  );

  authAndUsers$: Observable<{
    auth: AuthUserProfileEntity;
    users: { value: string; label: string }[];
  }> = combineLatest([this.auth$, this.mappedUsers$]).pipe(
    map(([auth, users]) => ({ auth, users }))
  );

  signingDown$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  eachTagSelected$ = this.filterService.eachTagSelected$;

  collapseDoneContainer() {
    this.isDoneContainerCollapsed$.next(!this.isDoneContainerCollapsed$.value);
    this.writeLocalStorageDoneCollapseSetting(
      this.isDoneContainerCollapsed$.value
    );
  }

  takeUp(up: Up) {
    this.takeNextUpUsecase.execute(up.id.toString());
  }

  signDown() {
    this.signingDown$.next(true);
  }

  signDownSubmit(event: {
    autocomplete: string;
    number?: number;
    callbacks: { complete: Function; error: Function };
    hasSequenceNumber: boolean;
  }) {
    const callbacks = {
      error: event.callbacks.error,
      complete: () => {
        event.callbacks.complete();
        this.signDownCompleted();
      },
    };
    this.newClaimUsecase.execute(
      event.autocomplete,
      event?.number,
      callbacks,
      event.hasSequenceNumber
    );
  }

  signDownCompleted() {
    this.signingDown$.next(false);
  }

  signDownCancel() {
    this.signingDown$.next(false);
  }

  signDownState(state: boolean) {
    this.signingDown$.next(state);
  }

  performSkip(event: {
    card: TapeCardModel;
    data: { reason: string; loseTurn: boolean };
  }) {
    this.skipTurnUsecase.execute(
      event.card.id,
      event.data.reason,
      event.data.loseTurn
    );
  }

  dropOnTape(
    event: CdkDragDrop<
      Up[],
      Up[],
      {
        card: Up;
        auth: AuthUserProfileEntity;
        index: number;
      }
    >
  ) {
    if (
      event.previousIndex !== event.currentIndex &&
      event.previousContainer === event.container
    ) {
      const ids = event.container.data.map((i) => i.id);
      this.reorderUptapeUsecase.execute(
        event.item.data.card.id,
        event.currentIndex,
        event.previousIndex,
        ids
      );
    } else if (event.previousContainer !== event.container) {
      this.nowAvailable(
        event.item.data.card.id,
        event.item.data.card.attributes.state
      );
    }
  }

  nowAvailable(upId: string, initalState: UpStateEnum) {
    this.nowAvailableUsecase.execute(upId, initalState);
  }

  dropWithCustomer(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      // Do nothing
    } else {
      const upRaw = event.previousContainer.data[event.previousIndex];
      const up = UpMapper.toDomain(upRaw);
      if (up.isFailure) {
        alert('Please refresh the screen. Something went wrong.');
        return;
      }
      const upData = up.getValue();
      this.takeNextUpUsecase.execute(upData.id.toString());
    }
  }

  private buildUp = (upRaw: Up): UpEntity => {
    const up = UpMapper.toDomain(upRaw);
    if (up.isFailure) {
      alert('Please refresh the screen. Something went wrong.');
    }
    return up.getValue();
  };

  dropDone(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      // Do nothing
    } else {
      const upRaw = event.previousContainer.data[event.previousIndex];
      const upData = this.buildUp(upRaw);
      this.doneUsecase.execute(upData.id.toString(), upData.attributes.state);
    }
  }

  doneButton(upRaw: Up) {
    const upData = this.buildUp(upRaw);
    this.doneUsecase.execute(upData.id.toString(), upData.attributes.state);
  }

  toggleSalesProcess(
    card: Up,
    event: { toggleItem: SalesProcessToggleItem[] }
  ) {
    const { toggleItem } = event;
    const steps = toggleItem.reduce((acc, curr) => {
      return { ...acc, [curr.id]: curr.value };
    }, {});

    const currentProgress = toggleItem.reduce((acc, curr) => {
      return {
        ...acc,
        description: curr['description'],
        id: curr.id,
      };
    });
    if (currentProgress['description']) {
      return this.progressFinishUsecase.execute(
        card.id,
        currentProgress as ToggleItemHasMany
      );
    }
    return this.progressUsecase.execute(card.id, steps);
  }

  goToUpLog() {
    this.router.navigate(['uptape', 'log']);
  }

  passed(upId: string) {
    this.skipTurnUsecase.execute(upId, 'PASSED', true);
  }

  resetUp = (event: TapeCardModel) => {
    this.resetUptapeUsecase.execute(event.id);
  };

  formatTicker = (ticks: string[]) => {
    return (value: number) => {
      const d = new Date(ticks[value]);
      const toTz = utcToZonedTime(d, 'America/Los_Angeles');
      return format(toTz, 'h:mm a');
    };
  };

  isSkippedPredicate = (
    item: CdkDrag<{ card: Up; index: number; auth: AuthUserProfileEntity }>
  ) => {
    const { auth, card } = item.data;

    const isAble = (role: string) => ['admin', 'manager'].includes(role);
    return (
      card &&
      (card.attributes.state === UpStateEnum.WithCustomerPassed ||
        (card.attributes.state === UpStateEnum.WithCustomerSkipped &&
          (auth.attributes.roles.some(isAble) ||
            card.attributes.assignedTo === auth.id.toString())))
    );
  };

  nextOnTapePredicate = (
    item: CdkDrag<{ card: Up; index: number; auth: AuthUserProfileEntity }>
  ) => {
    return item.data && item.data.index === 0;
  };

  withCustomerPredicate = (
    item: CdkDrag<{ card: Up; index: number; auth: AuthUserProfileEntity }>
  ) => {
    return (
      item.data && item.data.card.attributes.state === UpStateEnum.WithCustomer
    );
  };

  //SSE

  async fetchDataWithFibonacciBackoff(
    url: string,
    token: string
  ): Promise<EventSource> {
    let evtSource: EventSource | undefined;
    let attempt = 0;
    let fib = [1, 2];

    while (true) {
      try {
        evtSource = new EventSource(`${url}?access_token=${token}`);

        const response = await fetch(`${url}?access_token=${token}`, {
          method: 'HEAD',
        });

        if (response.status === 200) {
          console.log('sse is ok');
          return evtSource;
        } else {
          console.log('not connected');
        }
      } catch (error) {
        if (attempt >= fib.length) {
          console.log('Failed to connect to sse');
        } else {
          console.log(`Attempt ${attempt + 1} failed. Retrying...`);

          attempt++;

          fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
        }
      }
    }
  }
}
