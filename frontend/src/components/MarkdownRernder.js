import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MarkdownRenderer = ({ answer, className = '' }) => {
  const additionalStyles = {
    // Code blocks
    codeBlock: {
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      padding: '16px',
      borderRadius: '8px',
      fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
      fontSize: '14px',
      lineHeight: '1.5',
      overflow: 'auto',
      margin: '16px 0',
      border: '1px solid #333',
    },
    
    // Inline code
    inlineCode: {
      backgroundColor: '#f5f5f5',
      color: '#d73a49',
      padding: '2px 6px',
      borderRadius: '4px',
      fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
      fontSize: '0.9em',
      border: '1px solid #e1e4e8',
    },
    
    // Strong/bold text
    strongText: {
      fontWeight: '600',
      color: '#24292e',
    },
    
    // Emphasis/italic text
    emphasisText: {
      fontStyle: 'italic',
      color: '#586069',
    },
    
    // Headings
    heading1: {
      fontSize: '1.5em',
      fontWeight: '700',
      marginBottom: '16px',
      marginTop: '24px',
      borderBottom: '2px solid #eaecef',
      paddingBottom: '8px',
      color: '#24292e',
    },
    
    heading2: {
      fontSize: '1.25em',
      fontWeight: '600',
      marginBottom: '12px',
      marginTop: '20px',
      borderBottom: '1px solid #eaecef',
      paddingBottom: '6px',
      color: '#24292e',
    },
    
    heading3: {
      fontSize: '1.25em',
      fontWeight: '600',
      marginBottom: '10px',
      marginTop: '16px',
      color: '#24292e',
    },
    
    heading4: {
      fontSize: '1em',
      fontWeight: '600',
      marginBottom: '8px',
      marginTop: '16px',
      color: '#24292e',
    },
    
    heading5: {
      fontSize: '0.875em',
      fontWeight: '600',
      marginBottom: '8px',
      marginTop: '16px',
      color: '#586069',
    },
    
    heading6: {
      fontSize: '0.85em',
      fontWeight: '600',
      marginBottom: '8px',
      marginTop: '16px',
      color: '#6a737d',
    },
    
    // Paragraphs
    paragraph: {
      lineHeight: '1.6',
    },
    
    // Lists
    unorderedList: {
      paddingLeft: '24px',
      marginBottom: '16px',
      listStyleType: 'disc',
    },
    
    orderedList: {
      paddingLeft: '24px',
      marginBottom: '16px',
      listStyleType: 'decimal',
    },
    
    listItem: {
      marginBottom: '4px',
      lineHeight: '1.6',
      color: '#24292e',
    },
    
    // Blockquotes
    blockquote: {
      borderLeft: '4px solid #dfe2e5',
      paddingLeft: '16px',
      marginLeft: '0',
      marginRight: '0',
      marginBottom: '16px',
      color: '#6a737d',
      fontStyle: 'italic',
      backgroundColor: '#f6f8fa',
      padding: '12px 16px',
      borderRadius: '0 6px 6px 0',
    },
    
    // Links
    link: {
      color: '#0366d6',
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
    
    // Horizontal rule
    horizontalRule: {
      height: '0.25em',
      backgroundColor: '#e1e4e8',
      border: 'none',
      margin: '24px 0',
    },
    
    // Tables
    table: {
      borderCollapse: 'collapse',
      width: '100%',
      marginBottom: '16px',
      border: '1px solid #d0d7de',
    },
    
    tableHeader: {
      backgroundColor: '#f6f8fa',
      fontWeight: '600',
      padding: '12px',
      textAlign: 'left',
      border: '1px solid #d0d7de',
    },
    
    tableCell: {
      padding: '12px',
      border: '1px solid #d0d7de',
      verticalAlign: 'top',
    },
    
    tableRow: {
      borderTop: '1px solid #d0d7de',
      '&:nth-child(2n)': {
        backgroundColor: '#f6f8fa',
      },
    },
    
    // Delete/strikethrough
    deleteText: {
      textDecoration: 'line-through',
      color: '#6a737d',
    },
  };

  const components = {
    // Code blocks with syntax highlighting
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const childrenString = String(children);
      
      // Check if it's truly inline code (single line, no language specified, shorter content)
      const isInlineCode = inline || 
        (!className && !childrenString.includes('\n') && childrenString.length < 100);
      
      return !isInlineCode ? (
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          customStyle={{
            margin: '16px 0',
            borderRadius: '8px',
            fontSize: '14px',
          }}
          {...props}
        >
          {childrenString.replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code style={additionalStyles.inlineCode} {...props}>
          {children}
        </code>
      );
    },
    
    // Headings
    h1({ children }) {
      return <h1 style={additionalStyles.heading1}>{children}</h1>;
    },
    h2({ children }) {
      return <h2 style={additionalStyles.heading2}>{children}</h2>;
    },
    h3({ children }) {
      return <h3 style={additionalStyles.heading3}>{children}</h3>;
    },
    h4({ children }) {
      return <h4 style={additionalStyles.heading4}>{children}</h4>;
    },
    h5({ children }) {
      return <h5 style={additionalStyles.heading5}>{children}</h5>;
    },
    h6({ children }) {
      return <h6 style={additionalStyles.heading6}>{children}</h6>;
    },
    
    // Text formatting
    strong({ children }) {
      return <strong style={additionalStyles.strongText}>{children}</strong>;
    },
    em({ children }) {
      return <em style={additionalStyles.emphasisText}>{children}</em>;
    },
    del({ children }) {
      return <del style={additionalStyles.deleteText}>{children}</del>;
    },
    
    // Paragraphs
    p({ children }) {
      return <p style={additionalStyles.paragraph}>{children}</p>;
    },
    
    // Lists
    ul({ children }) {
      return <ul style={additionalStyles.unorderedList}>{children}</ul>;
    },
    ol({ children }) {
      return <ol style={additionalStyles.orderedList}>{children}</ol>;
    },
    li({ children }) {
      return <li style={additionalStyles.listItem}>{children}</li>;
    },
    
    // Blockquotes
    blockquote({ children }) {
      return <blockquote style={additionalStyles.blockquote}>{children}</blockquote>;
    },
    
    // Links
    a({ href, children }) {
      return (
        <a 
          href={href}
          style={additionalStyles.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },
    
    // Horizontal rule
    hr() {
      return <hr style={additionalStyles.horizontalRule} />;
    },
    
    // Tables
    table({ children }) {
      return <table style={additionalStyles.table}>{children}</table>;
    },
    th({ children }) {
      return <th style={additionalStyles.tableHeader}>{children}</th>;
    },
    td({ children }) {
      return <td style={additionalStyles.tableCell}>{children}</td>;
    },
    tr({ children }) {
      return <tr style={additionalStyles.tableRow}>{children}</tr>;
    },
  };

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        children={answer?.answer || answer || ''}
        components={components}
        remarkPlugins={[]}
        rehypePlugins={[]}
      />
    </div>
  );
};

export default MarkdownRenderer;