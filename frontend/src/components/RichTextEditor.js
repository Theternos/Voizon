import React, { useState, useRef, useEffect } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Indent,
    Outdent,
    Undo,
    Redo
} from 'lucide-react';

const RichTextEditor = ({
    value = '',
    onChange = () => { },
    height = '150px',
    style = {},
    placeholder = 'Start writing...'
}) => {
    const editorRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
        list: false,
        orderedList: false,
        alignLeft: true, // Default to left aligned
        alignCenter: false,
        alignRight: false,
        h1: false,
        h2: false,
        h3: false
    });

    useEffect(() => {
        if (editorRef.current && !isInitialized) {
            editorRef.current.innerHTML = value || '';
            setIsInitialized(true);
            // Set initial focus and update formats
            setTimeout(() => {
                if (editorRef.current) {
                    editorRef.current.focus();
                    updateActiveFormats();
                }
            }, 100);
        }
    }, [value, isInitialized]);

    const updateContent = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const updateActiveFormats = () => {
        if (!editorRef.current) return;

        try {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                // No selection, check if editor is focused
                if (document.activeElement === editorRef.current) {
                    // Use default states when no selection
                    setActiveFormats(prev => ({
                        ...prev,
                        bold: false,
                        italic: false,
                        underline: false,
                        list: false,
                        orderedList: false,
                        alignLeft: true,
                        alignCenter: false,
                        alignRight: false,
                        h1: false,
                        h2: false,
                        h3: false
                    }));
                }
                return;
            }

            // Get the current node
            let node = selection.anchorNode;
            if (!node) return;

            // If text node, get parent element
            if (node.nodeType === Node.TEXT_NODE) {
                node = node.parentElement;
            }

            // Ensure we're within the editor
            if (!editorRef.current.contains(node)) return;

            // Check text formatting
            const bold = document.queryCommandState('bold');
            const italic = document.queryCommandState('italic');
            const underline = document.queryCommandState('underline');

            // Check alignment - more reliable method
            const computedStyle = window.getComputedStyle(node);
            const textAlign = computedStyle.textAlign;
            const alignLeft = textAlign === 'left' || textAlign === 'start' || textAlign === '';
            const alignCenter = textAlign === 'center';
            const alignRight = textAlign === 'right' || textAlign === 'end';

            // Check list state
            const listParent = node.closest('ul, ol');
            const inList = listParent?.tagName === 'UL';
            const inOrderedList = listParent?.tagName === 'OL';

            // Check heading state
            const headingParent = node.closest('h1, h2, h3, h4, h5, h6');
            const isH1 = headingParent?.tagName === 'H1';
            const isH2 = headingParent?.tagName === 'H2';
            const isH3 = headingParent?.tagName === 'H3';

            setActiveFormats({
                bold,
                italic,
                underline,
                list: inList,
                orderedList: inOrderedList,
                alignLeft,
                alignCenter,
                alignRight,
                h1: isH1,
                h2: isH2,
                h3: isH3
            });
        } catch (error) {
            console.warn('Error updating active formats:', error);
        }
    };

    const formatText = (command, value = null) => {
        if (!editorRef.current) return;
        
        // Save current selection
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
        
        editorRef.current.focus();
        
        // Restore selection if it existed
        if (range) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        try {
            // Special handling for block formats
            if (command === 'formatBlock') {
                const currentBlock = getSelectionBlockElement();
                if (currentBlock?.tagName.toLowerCase() === value) {
                    // If already in this format, change to paragraph
                    document.execCommand('formatBlock', false, 'p');
                } else {
                    document.execCommand('formatBlock', false, value);
                }
            } 
            // Special handling for alignment commands
            else if (command.startsWith('justify')) {
                // Clear other alignments first
                document.execCommand('justifyLeft', false, null);
                document.execCommand('justifyCenter', false, null);
                document.execCommand('justifyRight', false, null);
                
                // Apply the new alignment
                if (command !== 'justifyLeft') {
                    document.execCommand(command, false, value);
                }
            } 
            // Special handling for lists
            else if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
                // Toggle list state
                const isCurrentlyList = (command === 'insertUnorderedList' && activeFormats.list) ||
                                      (command === 'insertOrderedList' && activeFormats.orderedList);
                
                if (isCurrentlyList) {
                    // Remove list formatting
                    document.execCommand(command, false, null);
                } else {
                    // First remove any existing list formatting
                    if (activeFormats.list) document.execCommand('insertUnorderedList', false, null);
                    if (activeFormats.orderedList) document.execCommand('insertOrderedList', false, null);
                    // Then apply new list format
                    document.execCommand(command, false, null);
                }
            }
            else {
                document.execCommand(command, false, value);
            }

            // Update content and formats
            updateContent();
            
            // Delay format update to allow DOM changes to take effect
            setTimeout(() => {
                updateActiveFormats();
            }, 10);
            
        } catch (error) {
            console.warn('Error executing command:', command, error);
        }
    };

    const getSelectionBlockElement = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;

        let node = selection.getRangeAt(0).commonAncestorContainer;
        
        // If text node, get parent element
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        if (!node) return null;

        // Find the nearest block-level ancestor
        const blockElements = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL'];
        while (node && node !== editorRef.current) {
            if (blockElements.includes(node.tagName)) {
                return node;
            }
            node = node.parentElement;
        }

        return node;
    };

    const handleKeyDown = (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b': e.preventDefault(); formatText('bold'); break;
                case 'i': e.preventDefault(); formatText('italic'); break;
                case 'u': e.preventDefault(); formatText('underline'); break;
                case 'z': 
                    e.preventDefault(); 
                    if (e.shiftKey) {
                        formatText('redo');
                    } else {
                        formatText('undo');
                    }
                    break;
                case 'y': e.preventDefault(); formatText('redo'); break;
                case 'l': e.preventDefault(); formatText('justifyLeft'); break;
                case 'e': e.preventDefault(); formatText('justifyCenter'); break;
                case 'r': e.preventDefault(); formatText('justifyRight'); break;
            }
        }
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                formatText('outdent');
            } else {
                formatText('indent');
            }
        }
    };

    const handleSelectionChange = () => {
        // Only update if our editor is focused
        if (document.activeElement === editorRef.current) {
            updateActiveFormats();
        }
    };

    const handleFocus = () => {
        updateActiveFormats();
    };

    const handleInput = () => {
        updateContent();
        // Small delay to let DOM update
        setTimeout(() => {
            updateActiveFormats();
        }, 10);
    };

    // Listen for selection changes
    useEffect(() => {
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const ToolbarButton = ({
        icon: Icon,
        title,
        onClick,
        isActive = false,
        disabled = false,
        shortcut = ''
    }) => (
        <button
            className={`toolbar-btn ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={onClick}
            title={`${title}${shortcut ? ` (${shortcut})` : ''}`}
            disabled={disabled}
            type="button"
            aria-label={title}
        >
            <Icon size={14} />
        </button>
    );

    const Separator = () => <div className="toolbar-separator" />;

    return (
        <div className="rich-text-editor-container" style={style}>
            <div className="rich-text-toolbar">
                <div className="toolbar-group">
                    <ToolbarButton icon={Undo} title="Undo" onClick={() => formatText('undo')} shortcut="Ctrl+Z" />
                    <ToolbarButton icon={Redo} title="Redo" onClick={() => formatText('redo')} shortcut="Ctrl+Y" />
                </div>
                <Separator />
                <div className="toolbar-group">
                    <ToolbarButton
                        icon={Bold}
                        title="Bold"
                        onClick={() => formatText('bold')}
                        isActive={activeFormats.bold}
                        shortcut="Ctrl+B"
                    />
                    <ToolbarButton
                        icon={Italic}
                        title="Italic"
                        onClick={() => formatText('italic')}
                        isActive={activeFormats.italic}
                        shortcut="Ctrl+I"
                    />
                    <ToolbarButton
                        icon={Underline}
                        title="Underline"
                        onClick={() => formatText('underline')}
                        isActive={activeFormats.underline}
                        shortcut="Ctrl+U"
                    />
                </div>
                <Separator />
                <div className="toolbar-group">
                    <ToolbarButton
                        icon={Heading1}
                        title="Heading 1"
                        onClick={() => formatText('formatBlock', 'h1')}
                        isActive={activeFormats.h1}
                    />
                    <ToolbarButton
                        icon={Heading2}
                        title="Heading 2"
                        onClick={() => formatText('formatBlock', 'h2')}
                        isActive={activeFormats.h2}
                    />
                    <ToolbarButton
                        icon={Heading3}
                        title="Heading 3"
                        onClick={() => formatText('formatBlock', 'h3')}
                        isActive={activeFormats.h3}
                    />
                </div>
                <Separator />
                <div className="toolbar-group">
                    <ToolbarButton
                        icon={List}
                        title="Bullet List"
                        onClick={() => formatText('insertUnorderedList')}
                        isActive={activeFormats.list}
                    />
                    <ToolbarButton
                        icon={ListOrdered}
                        title="Numbered List"
                        onClick={() => formatText('insertOrderedList')}
                        isActive={activeFormats.orderedList}
                    />
                    <ToolbarButton icon={Indent} title="Indent" onClick={() => formatText('indent')} shortcut="Tab" />
                    <ToolbarButton icon={Outdent} title="Outdent" onClick={() => formatText('outdent')} shortcut="Shift+Tab" />
                </div>
                <Separator />
                <div className="toolbar-group">
                    <ToolbarButton
                        icon={AlignLeft}
                        title="Align Left"
                        onClick={() => formatText('justifyLeft')}
                        isActive={activeFormats.alignLeft}
                        shortcut="Ctrl+L"
                    />
                    <ToolbarButton
                        icon={AlignCenter}
                        title="Align Center"
                        onClick={() => formatText('justifyCenter')}
                        isActive={activeFormats.alignCenter}
                        shortcut="Ctrl+E"
                    />
                    <ToolbarButton
                        icon={AlignRight}
                        title="Align Right"
                        onClick={() => formatText('justifyRight')}
                        isActive={activeFormats.alignRight}
                        shortcut="Ctrl+R"
                    />
                </div>
            </div>

            <div
                ref={editorRef}
                className="rich-text-editor"
                contentEditable
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onInput={handleInput}
                suppressContentEditableWarning={true}
                aria-label="Rich text editor"
                style={{ minHeight: height }}
                placeholder={placeholder}
            />

            <style jsx>{`
                .rich-text-editor-container {
                    width: 100%;
                    max-width: 800px;
                    margin: 10px auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .rich-text-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    padding: 6px;
                    background: #f8fafc;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px 6px 0 0;
                    flex-wrap: wrap;
                }

                .toolbar-group {
                    display: flex;
                    align-items: center;
                    gap: 1px;
                }

                .toolbar-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 26px;
                    height: 26px;
                    border: none;
                    background: transparent;
                    border-radius: 3px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: #374151;
                    font-size: 12px;
                }

                .toolbar-btn:hover:not(.disabled) {
                    background: #e5e7eb;
                    color: #111827;
                }

                .toolbar-btn.active {
                    background: #3b82f6;
                    color: white;
                }

                .toolbar-btn.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .toolbar-separator {
                    width: 1px;
                    height: 18px;
                    background: #d1d5db;
                    margin: 0 3px;
                }

                .rich-text-editor {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #e5e7eb;
                    border-top: none;
                    border-radius: 0 0 6px 6px;
                    outline: none;
                    background-color: white;
                    line-height: 1.5;
                    font-size: 14px;
                    overflow-y: auto;
                    scrollbar-width: thin;
                    color: black !important;
                    text-align: left;
                }

                .rich-text-editor:focus {
                    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
                }

                .rich-text-editor[placeholder]:empty:before {
                    content: attr(placeholder);
                    color: #9ca3af;
                    pointer-events: none;
                    display: block;
                }

                .rich-text-editor h1 {
                    font-size: 14pt;
                    margin: 8pt 0 4pt 0;
                    font-weight: bold;
                }

                .rich-text-editor h2 {
                    font-size: 12pt;
                    margin: 6pt 0 3pt 0;
                    font-weight: bold;
                }

                .rich-text-editor h3 {
                    font-size: 11pt;
                    margin: 5pt 0 2pt 0;
                    font-weight: bold;
                }

                .rich-text-editor ul,
                .rich-text-editor ol {
                    margin: 6pt 0;
                    padding-left: 18pt;
                }

                .rich-text-editor p {
                    margin: 4pt 0;
                    font-size: 10pt;
                }

                /* Mobile styles */
                @media (max-width: 768px) {
                    .rich-text-editor-container {
                        min-width: unset;
                        padding: 5px;
                    }

                    .rich-text-toolbar {
                        gap: 1px;
                        padding: 4px;
                    }

                    .toolbar-group {
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 1px;
                    }

                    .toolbar-btn {
                        width: 24px;
                        height: 24px;
                    }

                    .rich-text-editor {
                        padding: 8px;
                        font-size: 13px;
                    }
                }

                /* Tablet styles */
                @media (max-width: 1024px) and (min-width: 769px) {
                    .rich-text-editor-container {
                        max-width: 700px;
                    }

                    .toolbar-btn {
                        width: 28px;
                        height: 28px;
                    }
                }

                /* Small mobile devices */
                @media (max-width: 480px) {
                    .rich-text-toolbar {
                        justify-content: center;
                    }

                    .toolbar-group {
                        margin: 2px 0;
                    }

                    .toolbar-btn {
                        width: 22px;
                        height: 22px;
                    }

                    .rich-text-editor {
                        padding: 6px;
                        font-size: 12px;
                    }
                }
            `}</style>
        </div>
    );
};

export default RichTextEditor;