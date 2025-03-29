/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@angular/core';
import { ipcRenderer, webFrame } from 'electron';
// import * as childProcess from 'child_process';
import { PreferencesService } from '../preferences/preferences.service';

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  ipcRenderer: typeof ipcRenderer;
  webFrame: typeof webFrame;
  // TODO: Modify type
  childProcess: any;
  // TODO: Modify type
  fs: any;

  public portNumber: number;
  constructor(private preferencesService: PreferencesService) {
    if (this.isElectron()) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.webFrame = window.require('electron').webFrame;
      this.childProcess = window.require('child_process');
      this.fs = window.require('fs');

      this.ipcRenderer.once('port-message', (event, message) => {
        this.portNumber = message;
      });

      this.ipcRenderer.on('openPreferences', () => {
        if (!this.preferencesService.preferencesOpened.value) {
          this.preferencesService.preferencesOpened.next(true);
        }
      });
    }
  }

  /**
   * Returns true if electron is detected
   */
  isElectron(): boolean {
    return this.preferencesService.isElectron();
  }

  /**
   * Returns the random port number from electron main process
   */
  port(): number {
    return this.portNumber;
  }

  /**
   * Returns the platform.
   *   * Returns linux, darwin, or win32 for those platforms
   *   * Returns unknown if the platform is not linux, darwin, or win32
   *   * Returns a blank string is electron is not detected
   *
   */
  platform(): string {
    if (!this.isElectron()) {
      return '';
    }

    try {
      // @ts-ignore
      const platform = typeof process !== 'undefined' ? process.platform : window.process?.platform;

      switch (platform) {
        case 'linux':
        case 'darwin':
        case 'win32':
          return platform;
        default:
          return 'unknown';
      }
    } catch (e) {
      console.warn('Unable to determine platform:', e);
      return 'unknown';
    }
  }
}
