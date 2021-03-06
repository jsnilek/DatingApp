import {Injectable} from '@angular/core';
import {environment} from "../../environments/environment";
import {HubConnection, HubConnectionBuilder} from "@microsoft/signalr";
import {ToastrService} from "ngx-toastr";
import {User} from "../_models/user";
import {BehaviorSubject} from "rxjs";
import {take} from "rxjs/operators";
import {Router} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  hubUrl = environment.hubUrl;
  private hubConnections: HubConnection
  private onlineUsersSource = new BehaviorSubject<string[]>([]);
  onlineUsers$ = this.onlineUsersSource.asObservable();

  constructor(private toastr: ToastrService, private router: Router) {
  }

  createHubConnection(user: User) {
    this.hubConnections = new HubConnectionBuilder().withUrl(this.hubUrl + 'presence', {
      accessTokenFactory: () => user.token
    }).withAutomaticReconnect().build();

    this.hubConnections.start().catch(error => console.log(error));

    this.hubConnections.on('UserIsOnline', username => {
        this.onlineUsers$.pipe(take(1)).subscribe(usernames => this.onlineUsersSource.next([...usernames, username]));
      }
    )

    this.hubConnections.on('UserIsOffline', username => {
        this.onlineUsers$.pipe(take(1)).subscribe(usernames => {
          this.onlineUsersSource.next([...usernames.filter(x => x !== username)])
        })
      }
    )

    this.hubConnections.on('GetOnlineUsers', (usernames: string[]) => {
        this.onlineUsersSource.next(usernames);
      }
    )

    this.hubConnections.on('NewMessageReceived', (username: string, knowsAs: string) => {
        this.toastr.info(knowsAs + ' has sent you a new message!')
          .onTap
          .pipe(take(1))
          .subscribe(() => this.router.navigateByUrl('members/' + username + '?tab=3'));
      }
    )
  }

  stopHubConnection() {
    this.hubConnections.stop().catch(error => console.log(error));
  }

}
