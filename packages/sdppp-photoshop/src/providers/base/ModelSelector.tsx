import React, { useState, useEffect } from 'react';
import { Alert, Flex, Spin, Typography, Select, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

export interface ModelOption {
    value: string;
    label: React.ReactNode | string;
    searchText?: string;
    displayText?: string;
    deletable?: boolean;
}

interface ModelSelectorProps {
    // Basic props
    value?: string;
    placeholder?: string;
    loading?: boolean;
    loadError?: string;
    className?: string;
    
    // Options
    options: ModelOption[];
    
    // Callbacks
    onChange: (value: string) => Promise<void> | void;
    onInputChange?: (value: string) => void;
    onDelete?: (value: string) => Promise<void> | void;
    
    // Optional advanced features
    notFoundContent?: React.ReactNode;
}

export function ModelSelector({
    value,
    placeholder,
    loading,
    loadError,
    className = "renderer-model-select",
    options,
    onChange,
    onInputChange,
    onDelete,
    notFoundContent
}: ModelSelectorProps) {
    const [inputValue, setInputValue] = useState<string>(value || '');
    const [isHandling, setIsHandling] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [userInput, setUserInput] = useState<string>(''); // 追踪用户的真实输入

    useEffect(() => {
        if (value && !isFocused) {
            // Try to find display text from options, but only update if not focused
            const option = options.find(opt => opt.value === value);
            setInputValue(option?.displayText || value);
            setUserInput(''); // 清空用户输入追踪
        } else if (!value) {
            setInputValue('');
            setUserInput('');
        }
    }, [value, options, isFocused]);

    const handleChange = async (newValue: string) => {
        if (newValue === value || isHandling) {
            return;
        }
        
        setIsHandling(true);
        try {
            await onChange(newValue);
        } finally {
            setIsHandling(false);
        }
    };

    const handleInputChange = (newValue: string) => {
        setInputValue(newValue);
        setUserInput(newValue); // 记录用户的真实输入
        onInputChange?.(newValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        setInputValue('');
        // 使用 setTimeout 确保在下一个事件循环中执行，以覆盖默认的光标位置设置
        setTimeout(() => {
            if (e.target) {
                e.target.setSelectionRange(0, 0);
            }
        }, 0);
    };

    const handleBlur = () => {
        setIsFocused(false);
        // 优先使用用户的真实输入，否则使用当前输入值
        const valueToUse = userInput || inputValue;
        if (valueToUse && valueToUse.trim()) {
            handleChange(valueToUse);
        } else {
            // 如果没有输入值，恢复到之前的值，不触发变化事件
            setInputValue(value || '');
        }
        setUserInput(''); // 清空用户输入追踪
    };

    const handleEnterPress = () => {
        // 优先使用用户的真实输入，否则使用当前输入值
        const valueToUse = userInput || inputValue;
        if (valueToUse && valueToUse.trim()) {
            handleChange(valueToUse);
        }
    };

    const renderSelector = () => {
        return (
            <Select
                placeholder={placeholder}
                value={inputValue || undefined}
                onChange={(selectedValue, option) => {
                    const selectedOption = option as any;
                    if (selectedOption && selectedOption.displayText) {
                        setInputValue(selectedOption.displayText);
                    } else {
                        setInputValue(selectedValue);
                    }
                    handleChange(selectedValue);
                }}
                onSearch={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onInputKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleEnterPress();
                    }
                }}
                options={options.map(option => ({
                    ...option,
                    label: option.deletable && onDelete ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {React.isValidElement(option.label) ? option.label : <span>{option.label}</span>}
                            </div>
                            <Button
                                type="text"
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(option.value);
                                }}
                                style={{ 
                                    color: 'var(--sdppp-host-text-color-secondary)',
                                    flexShrink: 0,
                                    marginLeft: 8
                                }}
                            />
                        </div>
                    ) : option.label
                }))}
                showSearch={true}
                allowClear={true}
                filterOption={(input, option) => {
                    if (!option) return false;
                    const searchText = (option as any).searchText || '';
                    return searchText.toLowerCase().includes(input.toLowerCase());
                }}
                notFoundContent={notFoundContent}
                className={className}
                style={{ flex: 1 }}
            />
        );
    };

    return (
        <>
            {renderSelector()}
            {loadError && <Alert message={loadError} type="error" showIcon />}
            {(loading || isHandling) && (
                <Flex justify="center" align="center" style={{ width: '100%', height: '200px' }}>
                    <Spin />
                </Flex>
            )}
        </>
    );
}