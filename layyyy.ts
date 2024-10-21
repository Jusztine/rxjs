remove everything from the layout and move to the search datasource everything  

deleteRecordType({
    id,
    onSuccess,
    onFailure,
  }: {
    id: Uuid;
    onSuccess: () => void;
    onFailure: (errors: CallbackOnFailureModel) => void;
  }) {
    this.recordEntityStore.customRecordDelete({
      recordTypeId: id,
      onSuccess,
      onFailure,
    });
  }


  readonly customRecordDelete = this.effect(
    (
      actions$: Observable<{
        recordTypeId: string;
        onSuccess: () => void;
        onFailure?: (error) => void;
      }>
    ) => {
      return actions$.pipe(
        concatMap(
          (data: {
            recordTypeId: string;
            onSuccess: () => void;
            onFailure?: (error) => void;
          }) => {
            return this.searchRepo.deleteRecord(data.recordTypeId).pipe(
              tapResponse(
                () => {
                  data.onSuccess();
                  this.successfullDeleteCustomRecord({ id: data.recordTypeId });
                  this.routingStore.dispatch(
                    fromRoutingStore.showUnobtrusiveSnackbar({
                      message: 'Successfully Deleted Record',
                      button: 'Okay',
                    })
                  );
                },
                (error: any) => {
                  data.onFailure({
                    errorMsg:
                      error.message ||
                      'Could not delete record at this time. Please try again later.',
                  });
                }
              )
            );
          }
        )
      );
    }
  );
