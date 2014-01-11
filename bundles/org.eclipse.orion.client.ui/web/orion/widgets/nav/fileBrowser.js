/*******************************************************************************
 *
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*jslint browser:true devel:true sub:true*/
/*global define eclipse:true orion:true window*/

define([
	'orion/inputManager',
	'orion/breadcrumbs',
	'orion/folderView',
	'orion/widgets/nav/readonlyEditorView',
	'orion/markdownView',
	'orion/commandRegistry',
	'orion/Deferred',
	'orion/URITemplate',
	'orion/objects',
	'orion/webui/littlelib'
], function(
	mInputManager, mBreadcrumbs, mFolderView, mReadonlyEditorView, mMarkdownView,
	mCommandRegistry, Deferred, URITemplate, objects, lib
) {
	/**
	 * @class This object describes the options for the readonly file system browser.
	 * <p>
	 * <b>See:</b><br/>
	 * {@link orion.browse.FileBrowser}<br/>
	 * </p>		 
	 * @name orion.browse.FileBrowserOptions
	 *
	 * @property {String|DOMElement} parent the parent element for the file browser, it can be either a DOM element or an ID for a DOM element.
	 * @property {orion.fileClient.FileClient} fileClient the file client implementation that has all the interfaces from orion.fileClient.FileClient.
	 * @property {orion.highlight.SyntaxHighlighter} syntaxHighlighter the syntax highlighter that hihglights  a supported language file.
	 * @property {orion.core.ContentType} contentTypeService the content type service that knows a file's content type.
	 * @property {orion.preferences.PreferencesService} [preferences=null] the editor preferences. If not defined the default editor preferences is used.
	 */
	/**
	 * Constructs a new readonly file system browser.
	 * 
	 * @param {orion.browse.FileBrowserOptions} options the browser options.
	 * 
	 * @class A FileBrowser is a user interface for browsing a readonly file system.
	 * @name orion.browse.FileBrowser
	 */
	function FileBrowser(options) {
		this._parentDomNode = lib.node(options.parent);//Required
		this._fileClient = options.fileClient;//Required
		this._syntaxHighlighter = options.syntaxHighlighter;//Required
		this._contentTypeService = options.contentTypeService;//Required
		this._preferences = options.preferences;//Optional
		this._init(options);
	}
	objects.mixin(FileBrowser.prototype, {
		_init: function(options){
			this._commandRegistry = new mCommandRegistry.CommandRegistry({});
			this._inputManager = new mInputManager.InputManager({
				fileClient: this._fileClient,
				statusReporter: this._statusReport,
				contentTypeRegistry: this._contentTypeService
			});
			this._uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$
			
			this._inputManager.addEventListener("InputChanged", function(evt) { //$NON-NLS-0$
				var metadata = evt.metadata;
				this._breadCrumbName = evt.name;
				this._breadCrumbTarget = metadata;
				if (evt.input === null || evt.input === undefined) {
					this._breadCrumbName = this._lastRoot ? this._lastRoot.Name : "";
					this._breadCrumbTarget = this._lastRoot;
				}
				//this._breadCrumbMaker("localBreadCrumb");
				var view = this._getEditorView(evt.input, metadata);
				this._setEditor(view ? view.editor : null);
				evt.editor = this._editor;
			}.bind(this));

			var editorContainer = document.createElement("div"); //$NON-NLS-0$
			var editorOptions = {
				parent: editorContainer,
				syntaxHighlighter: this._syntaxHighlighter,
				inputManager: this._inputManager,
				preferences: this._preferences,
				statusReporter: function(message, type, isAccessible) {this._statusReport(message, type, isAccessible);}.bind(this)
			};
			this._editorView = new mReadonlyEditorView.ReadonlyEditorView(editorOptions);
		},
		_breadCrumbMaker: function(bcContainer, maxLength){
			this._renderBreadCrumb({
				task: "Browse", //$NON-NLS-0$
				name: this._breadCrumbName,
				target: this._breadCrumbTarget,
				breadCrumbContainer: bcContainer,
				makeBreadcrumbLink: function(segment, folderLocation, folder) {this._makeBreadCrumbLink(segment, folderLocation, folder);}.bind(this),
				makeBreadcrumFinalLink: true,
				fileClient: this._fileClient,
				maxLength: maxLength
			});
		},
		
		_setEditor: function(newEditor) {
			if (this._editor === newEditor) { return; }
			this._editor = newEditor;
		},
		_statusReport: function(message, type, isAccessible) {
			if (type === "progress") { //$NON-NLS-0$
				//TODO: Render message in the section header?
			} else if (type === "error") { //$NON-NLS-0$
				//TODO: Render message in the section header?
			} else {
				//TODO: Render message in the section header?
			}
		},
		_makeBreadCrumbLink: function(segment, folderLocation, folder) {
			var resource = folder ? folder.Location : this._fileClient.fileServiceRootURL(folderLocation);
			segment.href = this._uriTemplate.expand({resource: resource});
		},
		_renderBreadCrumb: function(options) {
			var fileSystemRootName;
			var breadcrumbRootName = options.breadcrumbRootName;
			var fileClient = options.fileClient;
			if (options.target) { // we have metadata
				if (fileClient && !options.breadcrumbTarget) {
					fileSystemRootName = breadcrumbRootName ? breadcrumbRootName + " " : ""; //$NON-NLS-1$ //$NON-NLS-0$
					fileSystemRootName = fileSystemRootName + fileClient.fileServiceName(options.target.Location);
					breadcrumbRootName = null;
				}
			} else {
				if (!options.breadcrumbTarget) {
					breadcrumbRootName = breadcrumbRootName || options.task || options.name;
				}
			}
			var locationNode = lib.node(options.breadCrumbContainer);
			if (locationNode) {
				lib.empty(locationNode);
				var resource = options.breadcrumbTarget || options.target;
				var workspaceRootURL = (fileClient && resource && resource.Location) ? fileClient.fileServiceRootURL(resource.Location) : null;
				new mBreadcrumbs.BreadCrumbs({
					container: locationNode,
					maxLength: options.maxLength,
					resource: resource,
					rootSegmentName: breadcrumbRootName,
					workspaceRootSegmentName: fileSystemRootName,
					workspaceRootURL: workspaceRootURL,
					makeFinalHref: options.makeBreadcrumFinalLink,
					makeHref: options.makeBreadcrumbLink
				});
			}
		},
		_getEditorView: function(input, metadata) {
			var view = null;
			if (metadata && input) {
				var folderViewOptons = {
					parent: this._parentDomNode,
					readonly: true,
					showProjectView: false,
					metadata: metadata,
					commandRegistry: this._commandRegistry,
					contentTypeRegistry: this._contentTypeService,
					inputManager: this._inputManager,
					fileService: this._fileClient,
					breadCrumbMaker: function(bcContainer, maxLength) {this._breadCrumbMaker(bcContainer, maxLength);}.bind(this)
				};
				if (metadata.Directory) {
					view = new mFolderView.FolderView(folderViewOptons);
				} else {
					var id = input.editor;
					if (!id || id === "orion.editor") { //$NON-NLS-0$
						folderViewOptons.editorView = this._editorView;
						view = new mFolderView.FolderView(folderViewOptons);
					} else if (id === "orion.markdownViewer") { //$NON-NLS-0$
						// TODO : not sure about this yetview = new mMarkdownView.MarkdownEditorView(options);
					} else {
						//TODO: handle other file types. E.g. image files
					}
				}
			}
			if (this._currentEditorView !== view) {
				if (this._currentEditorView) {
					this._currentEditorView.destroy();
				}
				this._currentEditorView = view;
				if (this._currentEditorView) {
					this._currentEditorView.create();
				}
			}
			return this._currentEditorView;
		},
		refresh: function(fileURI) {
			this._inputManager.setInput(fileURI);
		},
		create: function() {
		},
		destroy: function() {
		}
	});
	return {FileBrowser: FileBrowser};
});
